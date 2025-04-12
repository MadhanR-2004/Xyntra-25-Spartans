import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";

// Import ace modes and themes
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-monokai";

const EditorCard = React.forwardRef(({ onSubmit, isLoading, feedback, isQuestionGenerated }, ref) => {
  const [pseudocode, setPseudocode] = useState("");
  const editorRef = useRef(null);

  // Expose the clearEditor method via ref
  React.useImperativeHandle(ref, () => ({
    clearEditor: () => {
      setPseudocode("");
    }
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Pass the pseudocode to the parent component without clearing it
    onSubmit(pseudocode);
  };

  const handleClear = () => {
    setPseudocode("");
  };

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Your Solution</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <AceEditor
              ref={editorRef}
              mode="python"
              theme="monokai"
              name="editor"
              width="100%"
              height="300px"
              value={pseudocode}
              onChange={setPseudocode}
              fontSize={16}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 4,
              }}
            />
          </div>
          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClear}
            >
              Clear Editor
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !isQuestionGenerated}
            >
              {isLoading ? "Evaluating..." : "Submit Solution"}
            </button>
          </div>
          {feedback && !isLoading && (
            <div className="mt-3 alert alert-info">{feedback}</div>
          )}
        </form>
      </div>
    </div>
  );
});

export default EditorCard;