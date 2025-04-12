from flask import Flask, request, jsonify
import json
import re
from flask_cors import CORS
import requests
import threading
import queue
import time
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

MODEL_NAME = "qwen2.5-coder:14b"
OLLAMA_API_URL = "http://182.71.102.210:11434/v1/chat/completions"

# Configure request timeouts and limits
REQUEST_TIMEOUT = 180  # seconds for API requests
STALE_REQUEST_THRESHOLD = 180  # seconds before considering a request stale
MAX_QUEUE_SIZE = 20  # maximum number of requests to queue

# Set up a request queue and worker threads to handle Ollama API calls
request_queue = queue.Queue()
results = {}
request_lock = threading.Lock()  # Lock for thread-safe access to results

def validate_request_data(data, required_fields):
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    return True, ""

def ensure_valid_json_response(response_content):
    """Ensures that the response from the LLM is properly formatted as valid JSON."""
    # Define the expected structure with default values
    default_data = {
        "title": "Generated Algorithm Question",
        "problem": "Problem description unavailable",
        "examples": [{"input": "N/A", "output": "N/A"}],
        "constraints": ["No constraints provided"],
        "explanation": "No explanation provided"
    }
    
    # Remove any markdown code block formatting
    cleaned_content = re.sub(r"```json|```", "", response_content).strip()
    
    # Try multiple parsing approaches
    parsed_data = None
    error_msg = None
    
    # Approach 1: Direct JSON parsing
    try:
        parsed_data = json.loads(cleaned_content)
    except json.JSONDecodeError:
        pass
    
    # Approach 2: Fix quote issues and try again
    if not parsed_data:
        try:
            # Replace single quotes with double quotes
            fixed_content = cleaned_content.replace("'", '"')
            parsed_data = json.loads(fixed_content)
        except json.JSONDecodeError:
            pass
    
    # Approach 3: Fix nested quotes and array formatting issues
    if not parsed_data:
        try:
            fixed_content = cleaned_content.replace("'", '"')
            # Fix issues with escaped quotes in nested JSON strings
            fixed_content = re.sub(r'"input\d*":\s*"(\[.*?\])"', r'"input": \1', fixed_content)
            fixed_content = re.sub(r'"output\d*":\s*"(\[.*?\])"', r'"output": \1', fixed_content)
            parsed_data = json.loads(fixed_content)
        except json.JSONDecodeError:
            pass
    
    # Approach 4: Use regex to extract structured data
    if not parsed_data:
        try:
            # Extract title
            title_match = re.search(r'"title":\s*"([^"]+)"', cleaned_content)
            title = title_match.group(1) if title_match else default_data["title"]
            
            # Extract problem
            problem_match = re.search(r'"problem":\s*"([^"]+)"', cleaned_content)
            problem = problem_match.group(1) if problem_match else default_data["problem"]
            
            # Extract examples
            examples = []
            examples_section = re.search(r'"examples":\s*\[(.*?)\]', cleaned_content, re.DOTALL)
            if examples_section:
                example_items = re.findall(r'{(.*?)}', examples_section.group(1), re.DOTALL)
                for item in example_items:
                    input_match = re.search(r'"input\d*":\s*"?([^",}]+)"?', item)
                    output_match = re.search(r'"output\d*":\s*"?([^",}]+)"?', item)
                    examples.append({
                        "input": input_match.group(1) if input_match else "N/A", 
                        "output": output_match.group(1) if output_match else "N/A"
                    })
            
            if not examples:
                examples = default_data["examples"]
            
            # Extract constraints
            constraints = []
            constraints_section = re.search(r'"constraints":\s*\[(.*?)\]', cleaned_content, re.DOTALL)
            if constraints_section:
                constraints_raw = constraints_section.group(1)
                constraints = [c.strip(' "') for c in re.findall(r'"([^"]+)"', constraints_raw)]
            
            if not constraints:
                constraints = default_data["constraints"]
            
            # Extract explanation
            explanation_match = re.search(r'"explanation":\s*"([^"]+)"', cleaned_content)
            explanation = explanation_match.group(1) if explanation_match else default_data["explanation"]
            
            parsed_data = {
                "title": title,
                "problem": problem,
                "examples": examples,
                "constraints": constraints,
                "explanation": explanation
            }
            error_msg = "Data extracted using pattern matching due to JSON parsing failure"
        except Exception as e:
            error_msg = f"Failed to parse response: {str(e)}"
            parsed_data = default_data.copy()
            parsed_data["explanation"] += f"\nRaw response: {response_content}"
    
    # Final validation and default values for missing fields
    if parsed_data:
        # Ensure all required fields exist
        for key, default_value in default_data.items():
            if key not in parsed_data or parsed_data[key] is None:
                parsed_data[key] = default_value
        
        # Validate examples format
        if not isinstance(parsed_data["examples"], list):
            parsed_data["examples"] = default_data["examples"]
        else:
            # Normalize example format
            normalized_examples = []
            for example in parsed_data["examples"]:
                if isinstance(example, dict):
                    # Extract input/output keys with various possible names
                    input_value = None
                    output_value = None
                    
                    for k in example.keys():
                        if k.startswith("input"):
                            input_value = example[k]
                        elif k.startswith("output"):
                            output_value = example[k]
                    
                    normalized_examples.append({
                        "input": input_value if input_value is not None else "N/A",
                        "output": output_value if output_value is not None else "N/A"
                    })
                else:
                    normalized_examples.append({"input": "N/A", "output": "N/A"})
            
            parsed_data["examples"] = normalized_examples if normalized_examples else default_data["examples"]
        
        # Validate constraints format
        if not isinstance(parsed_data["constraints"], list):
            parsed_data["constraints"] = [str(parsed_data["constraints"])]
    
    return parsed_data if parsed_data else default_data, error_msg

# Request worker function to run in a separate thread
def process_ollama_requests():
    """Worker function to process Ollama API requests in a separate thread"""
    while True:
        try:
            # Get request from queue
            request_id, payload, callback = request_queue.get(timeout=1)
            
            # Update status to "processing"
            with request_lock:
                if request_id in results:
                    results[request_id]["status"] = "processing"
                    results[request_id]["processing_started"] = time.time()
                    print(f"Request {request_id} now processing at {datetime.now().strftime('%H:%M:%S')}")
            
            try:
                # Make API call with timeout
                response = requests.post(OLLAMA_API_URL, json=payload, timeout=REQUEST_TIMEOUT)
                result = response.json()
                
                # Process the result with the callback function
                callback(request_id, result, None)
            except Exception as e:
                # Report error back through callback
                error_msg = str(e)
                print(f"Error processing request {request_id}: {error_msg}")
                callback(request_id, None, error_msg)
            
            # Mark task as done
            request_queue.task_done()
        except queue.Empty:
            # No tasks in queue, just continue
            pass
        except Exception as e:
            print(f"Worker thread error: {e}")
            # Short sleep to prevent CPU spinning if there's a persistent error
            time.sleep(0.1)

# Start worker threads
NUM_WORKER_THREADS = 5  # Increased from 3 to 5
worker_threads = []
for _ in range(NUM_WORKER_THREADS):
    thread = threading.Thread(target=process_ollama_requests, daemon=True)
    thread.start()
    worker_threads.append(thread)

# Thread to periodically clean up stale requests
def cleanup_stale_requests():
    """Check for stale requests and mark them as timed out"""
    while True:
        try:
            current_time = time.time()
            with request_lock:
                for req_id, data in list(results.items()):
                    if data["status"] in ["queued", "processing"]:
                        if "queued_at" in data and (current_time - data["queued_at"]) > STALE_REQUEST_THRESHOLD:
                            print(f"Request {req_id} timed out after {STALE_REQUEST_THRESHOLD} seconds")
                            results[req_id] = {
                                "status": "error",
                                "message": f"Request timed out after {STALE_REQUEST_THRESHOLD} seconds",
                                "error_type": "timeout"
                            }
        except Exception as e:
            print(f"Cleanup thread error: {e}")
        
        # Check every 30 seconds
        time.sleep(30)

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_stale_requests, daemon=True)
cleanup_thread.start()

def generate_unique_id():
    """Generate a unique request ID"""
    return str(uuid.uuid4())

@app.route('/generate-question', methods=['POST'])
def generate_question():
    """Generate a new algorithm question"""
    # First check if we're at capacity
    if request_queue.qsize() >= MAX_QUEUE_SIZE:
        return jsonify({
            "status": "error",
            "message": "Server is currently busy. Please try again later.",
            "error_type": "server_busy"
        }), 503  # Service Unavailable
    
    if not request.is_json:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 400
        
    data = request.json
    difficulty = data.get("difficulty", "medium").lower()
    if difficulty not in ["easy", "medium", "hard"]:
        return jsonify({"status": "error", "message": "Invalid difficulty"}), 400
        
    topics = data.get("topics", [])
    if not isinstance(topics, list):
        return jsonify({"status": "error", "message": "Topics must be a list"}), 400
        
    existing_titles = data.get("existing_titles", [])
    if not isinstance(existing_titles, list):
        return jsonify({"status": "error", "message": "Existing titles must be a list"}), 400

    topics_text = ", ".join(topics) if topics else "any topic"
    difficulty_capitalized = difficulty.capitalize()
    
    prompt = f"""Generate a {difficulty} difficulty algorithm question on {topics_text}.
Requirements:
1. Provide a UNIQUE title (different from: {', '.join(existing_titles) if existing_titles else 'none'}).
2. Explain the problem in detail.
3. Include 2-3 example inputs and outputs.
4. Specify 3-5 constraints.
5. Make it suitable for {difficulty} level.
6. DO NOT provide pseudocode.
7. Ensure that the example input and output are always structured as key-value pairs, where:
   - **Keys should be strings.**
   - **Values should also be strings.**
   - **If there are multiple input parameters, represent them as a single string in the input key, formatted as "param1=value1,param2=value2".**
   - **If the input or output contains an array, convert the array into a comma-separated string enclosed in brackets "[value1, value2, ...]".**

⚠️ IMPORTANT:
- Ensure if input is a string, don't use quotes (" " or '') to show the string, instead simply show the string
- Use proper JSON formatting for the response
- Ensure the output is valid JSON with no invalid escape characters
- if input is array or binary or graph use arrays to give inpu and output for eg.)if it a tree Input: root = [1,3,null,null,2] Output: [3,1,null,null,2]


Return valid JSON:
{{
  "title": "Unique Title [{difficulty_capitalized}]",
  "problem": "Problem description",
  "examples": [
    {{"input":"param 1,param 2 ..", "output": "output 1"}},
    {{"input": "example 2", "output": "output 2"}}
  ],
  "constraints": ["Constraint 1", "Constraint 2"],
  "explanation": "brief explanation of the algorithm used in the question and how it is applied"
}}
"""
    
    # Setup request ID and payload
    request_id = generate_unique_id()
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.7}
    }
    
    # Create entry in results dictionary BEFORE adding to queue
    print(f"Creating new request: {request_id} at {datetime.now().strftime('%H:%M:%S')}")
    with request_lock:
        results[request_id] = {
            "status": "queued",
            "queued_at": time.time(),
            "message": "Question generation has been queued"
        }
    
    # Add request to processing queue
    request_queue.put((request_id, payload, process_question_response))
    
    # Return response with request ID for polling
    return jsonify({
        "request_id": request_id,
        "status": "queued",
        "message": "Question generation has been queued. Poll /check-question-status to get results."
    })

def process_question_response(request_id, result, error):
    """Callback function to process the question generation response"""
    if error:
        with request_lock:
            results[request_id] = {
                "status": "error",
                "message": f"Error during processing: {error}",
                "error_type": "processing_error"
            }
        return
    
    try:
        response_content = result["choices"][0]["message"]["content"]
        question_data, error = ensure_valid_json_response(response_content)
        print(f"Processing response for request ID: {request_id}")
        
        # Format the Markdown content
        formatted_content = f"""
## Problem Statement
{question_data['problem']}

## Examples
{'\n'.join(
    f"```plaintext\nInput: {ex['input']}\nOutput: {ex['output']}\n```" 
    for ex in question_data['examples']
)}

## Constraints
{'\n'.join(f"- {constraint}" for constraint in question_data['constraints'])}

## Explanation
{question_data['explanation']}
"""
        
        with request_lock:
            results[request_id] = {
                "status": "success",
                "title": question_data['title'],
                "question": formatted_content,
                "raw_data": question_data,
                "parse_error": error if error else None,
                "completed_at": time.time()
            }
        print(f"Successfully processed question for request ID: {request_id}")
    except Exception as e:
        print(f"Error processing question for request ID {request_id}: {str(e)}")
        with request_lock:
            results[request_id] = {
                "status": "error",
                "message": f"Error processing question: {str(e)}",
                "error_type": "processing_error"
            }

@app.route('/check-question-status/<request_id>', methods=['GET'])
def check_question_status(request_id):
    """Check the status of a question generation request"""
    with request_lock:
        if request_id not in results:
            return jsonify({
                "status": "unknown",
                "message": "Request ID not found"
            })
        
        result = results[request_id].copy()  # Make a copy to avoid race conditions
        
        # If the result is complete, remove it from results
        if result["status"] in ["success", "error"]:
            if "completed_at" not in result:
                result["completed_at"] = time.time()
            
            # Only remove if we're sending the final result
            results.pop(request_id, None)
    
    return jsonify(result)

@app.route("/evaluate-pseudocode", methods=["POST"])
def evaluate_pseudocode():
    """Evaluate pseudocode for a given question"""
    # First check if we're at capacity
    if request_queue.qsize() >= MAX_QUEUE_SIZE:
        return jsonify({
            "status": "error",
            "message": "Server is currently busy. Please try again later.",
            "error_type": "server_busy"
        }), 503  # Service Unavailable
    
    if not request.is_json:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 400
    
    data = request.json
    question = data.get("question")
    pseudocode = data.get("pseudocode")

    if not question or not pseudocode:
        return jsonify({"status": "error", "message": "Question or pseudocode missing"}), 400

    prompt = f"""Evaluate the given pseudocode based on its logic, not syntax. Focus on:
1. Correctness of the algorithm
2. Logical flow and structure
3. Edge case handling

Return STRICTLY VALID JSON with this exact format:
{{
  "evaluation": "Correct" or "Incorrect",
  "score": (integer from 0 to 10),
  "feedback": "Detailed explanation of evaluation",
  "next": "New question related to topic (only if score >7)"
}}

Question: {question}

Pseudocode:
{pseudocode}

IMPORTANT: Your response must be pure JSON without any additional text or markdown formatting."""

    # Setup request ID and payload
    request_id = generate_unique_id()
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.3}
    }
    
    # Create entry in results dictionary BEFORE adding to queue
    print(f"Creating new evaluation request: {request_id} at {datetime.now().strftime('%H:%M:%S')}")
    with request_lock:
        results[request_id] = {
            "status": "queued",
            "queued_at": time.time(),
            "message": "Evaluation has been queued"
        }
    
    # Add request to processing queue
    request_queue.put((request_id, payload, process_evaluation_response))
    
    # Return response with request ID for polling
    return jsonify({
        "request_id": request_id,
        "status": "queued",
        "message": "Evaluation has been queued. Poll /check-evaluation-status to get results."
    })

def process_evaluation_response(request_id, result, error):
    """Callback function to process the pseudocode evaluation response"""
    if error:
        with request_lock:
            results[request_id] = {
                "status": "error",
                "evaluation": "Error",
                "score": 0,
                "feedback": f"Evaluation error: {error}",
                "next_question": None,
                "error_type": "processing_error"
            }
        return
    
    try:
        raw_content = result["choices"][0]["message"]["content"]
        print(f"Processing evaluation for request ID: {request_id}")
        
        # Remove all markdown formatting and ensure valid JSON
        cleaned_content = re.sub(r'^```json|```$', '', raw_content, flags=re.IGNORECASE).strip()
        cleaned_content = re.sub(r'^json|^`', '', cleaned_content, flags=re.IGNORECASE).strip()
        
        # Handle cases where response might have text before/after JSON
        json_match = re.search(r'\{.*\}', cleaned_content, re.DOTALL)
        if not json_match:
            raise ValueError("No valid JSON found in response")
            
        json_str = json_match.group(0)
        
        # Parse with strict validation
        parsed_result = json.loads(json_str)
        
        # Validate required fields
        required_fields = ["evaluation", "score", "feedback"]
        for field in required_fields:
            if field not in parsed_result:
                raise ValueError(f"Missing required field: {field}")
                
        # Ensure score is within valid range
        score = int(parsed_result["score"])
        if not 0 <= score <= 10:
            raise ValueError("Score must be between 0 and 10")
            
        # Ensure evaluation is either Correct or Incorrect
        evaluation = parsed_result["evaluation"].lower()
        if evaluation not in ["correct", "incorrect"]:
            raise ValueError("Evaluation must be 'Correct' or 'Incorrect'")
            
        # Format the response consistently
        with request_lock:
            results[request_id] = {
                "status": "success",
                "evaluation": evaluation.capitalize(),
                "score": score,
                "feedback": parsed_result.get("feedback", "No feedback provided."),
                "next_question": parsed_result.get("next") if score > 7 else None,
                "completed_at": time.time()
            }
        print(f"Successfully processed evaluation for request ID: {request_id}")
    except Exception as e:
        error_msg = f"Evaluation error: {str(e)}"
        print(error_msg)
        with request_lock:
            results[request_id] = {
                "status": "error",
                "evaluation": "Error",
                "score": 0,
                "feedback": error_msg,
                "next_question": None,
                "error_type": "processing_error"
            }

@app.route('/check-evaluation-status/<request_id>', methods=['GET'])
def check_evaluation_status(request_id):
    """Check the status of an evaluation request"""
    with request_lock:
        if request_id not in results:
            return jsonify({
                "status": "unknown",
                "message": "Request ID not found"
            })
        
        result = results[request_id].copy()  # Make a copy to avoid race conditions
        
        # If the result is complete, remove it from results
        if result["status"] in ["success", "error"]:
            if "completed_at" not in result:
                result["completed_at"] = time.time()
            
            # Only remove if we're sending the final result
            results.pop(request_id, None)
    
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "queue_size": request_queue.qsize(),
        "active_requests": len(results),
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True)