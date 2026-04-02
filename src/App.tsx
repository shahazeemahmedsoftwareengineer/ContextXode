import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import "./App.css";

type FilesMap = Record<string, string>;

type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children?: TreeNode[];
};

function addPathToTree(tree: TreeNode[], segments: string[], fullPath: string) {
  if (segments.length === 0) return;

  const [head, ...rest] = segments;
  const existing = tree.find((node) => node.name === head);

  if (!existing) {
    const node: TreeNode = {
      name: head,
      path: fullPath,
      isFile: rest.length === 0,
      children: rest.length === 0 ? undefined : [],
    };

    tree.push(node);
    if (rest.length > 0) {
      addPathToTree(node.children!, rest, fullPath);
    }
  } else {
    if (rest.length > 0) {
      existing.children = existing.children ?? [];
      addPathToTree(existing.children, rest, fullPath);
    }
  }
}

function buildTree(filePaths: string[], basePath: string): TreeNode[] {
  const tree: TreeNode[] = [];

  filePaths.forEach((filePath) => {
    let relativePath = filePath;
    const normalizedBase = basePath.replace(/\\/g, "/").replace(/\/$/, "");
    const normalizedFile = filePath.replace(/\\/g, "/");

    if (normalizedFile.startsWith(normalizedBase)) {
      relativePath = normalizedFile.slice(normalizedBase.length).replace(/^\//, "");
    }

    const segments = relativePath.split("/").filter(Boolean);
    addPathToTree(tree, segments, filePath);
  });

  return tree;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === "package.json") return "📦";
  if (name.includes("gitignore")) return "🚫";

  switch (ext) {
    case "js": case "jsx": return "🟨";
    case "ts": case "tsx": return "🟦";
    case "rs": return "🦀";
    case "py": return "🐍";
    case "html": return "🌐";
    case "css": case "scss": return "🎨";
    case "json": return "⚙️";
    case "md": return "📝";
    case "toml": return "🛠️";
    case "png": case "jpg": case "jpeg": case "svg": case "ico": return "🖼️";
    case "txt": return "🗒️";
    default: return "📄";
  }
}

function App() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [fullContext, setFullContext] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [filesMap, setFilesMap] = useState<FilesMap>({});
  const [selectedFile, setSelectedFile] = useState("");
  const [path, setPath] = useState("");
  const [viewMode, setViewMode] = useState<"project" | "file">("project");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    setLoading(true);

    try {
      const folder = await invoke<string | null>("select_folder");
      if (!folder) {
        return;
      }

      setPath(folder);
      const result = await invoke<[string, string]>("export_project", {
        path: folder,
      });

      const map: FilesMap = {};
      const filePaths: string[] = [];

      result[1].split("# FILE:").forEach((block) => {
        const parts = block.split("\n--------------------\n");
        if (parts.length === 2) {
          const filePath = parts[0].trim();
          map[filePath] = parts[1].trim();
          filePaths.push(filePath);
        }
      });

      setTree(buildTree(filePaths, folder));
      setFullContext(`${result[0]}\n\n${result[1]}`);
      setViewMode("project");
      setExpandedPaths(new Set()); // Reset tree state on new export
      setFilesMap(map);
      setSelectedFile(""); // Default to full project view after export
    } catch (err) {
      console.error("Export failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : String(err) || "Unable to export project. Please try another folder."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path} className="tree-item-container">
        <div 
          className={`tree-row ${selectedFile === node.path ? 'selected' : ''}`}
          style={{ paddingLeft: (depth * 12) + 12 }}
          onClick={() => {
            if (node.isFile) {
              setSelectedFile(node.path);
              setViewMode("file");
            }
            else toggleFolder(node.path);
          }}
        >
          {!node.isFile && (
            <span className={`chevron ${expandedPaths.has(node.path) ? 'open' : ''}`}>
              ▶
            </span>
          )}
          <span className="icon">
            {node.isFile ? getFileIcon(node.name) : expandedPaths.has(node.path) ? "📂" : "📁"}
          </span>
          <span className="name">{node.name}</span>
        </div>
        
        {!node.isFile && expandedPaths.has(node.path) && node.children && (
          <div className="tree-children">
            {renderTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const selectedContent = selectedFile ? filesMap[selectedFile] : "";

  return (
    <div className="app">
      <style>{`
        /* Global Layout Fixes for Windows App Feel */
        html, body, #root { margin: 0; padding: 0; height: 100vh; overflow: hidden; }
        .app { height: 100vh; display: flex; background: #0a0a0c; color: #e2e8f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        
        /* Custom Scrollbar Styling */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 5px; border: 2px solid #0f172a; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }

        /* Dark Tone Buttons */
        .primary-button { 
          background: #1e293b !important; 
          border: 1px solid #334155 !important;
          color: #f8fafc !important;
          transition: all 0.2s ease;
        }
        .primary-button:hover { background: #334155 !important; border-color: #6366f1 !important; }
        
        .copy-btn { 
          background: #0f172a !important; 
          border: 1px solid #1e293b !important;
          color: #94a3b8 !important;
        }
        .copy-btn:hover { background: #1e293b !important; color: #fff !important; }

        /* Improved Sidebar Header & View All Button */
        .sidebar-header { 
          padding: 20px; 
          border-bottom: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .view-all-btn {
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .view-all-btn:hover { background: #1e293b; color: #fff; border-color: #475569; }
        
        /* Scrollable areas */
        .sidebar-list { overflow-y: auto; flex: 1; padding-top: 8px; }
        .code-box { overflow-y: auto; flex: 1; }
        .main { display: flex; flex-direction: column; height: 100vh; flex: 1; overflow: hidden; }
        .section { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin: 15px; }

        /* VS Code Style Tree */
        .tree-row {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
          color: #cccccc;
          transition: background 0.1s;
          user-select: none;
        }
        .tree-row:hover { background-color: #2a2d2e; }
        .tree-row.selected { background-color: #37373d; color: #ffffff; }
        
        .chevron {
          font-size: 8px;
          margin-right: 6px;
          width: 10px;
          transition: transform 0.1s;
          color: #858585;
        }
        .chevron.open { transform: rotate(90deg); }
        .icon { margin-right: 6px; font-size: 14px; }
        .name { overflow: hidden; text-overflow: ellipsis; }

        .tree-children {
          border-left: 1px solid #333333;
          margin-left: 18px;
        }

        /* View Toggle Switch */
        .view-toggle {
          display: flex;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 2px;
        }
        .view-toggle button {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 4px 12px;
          font-size: 11px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        /* EthicalAds slot styling */
        #contextxode-ad {
          margin-top: 20px;
          min-height: 100px;
          width: 100%;
          max-width: 100%;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid #334155;
          border-radius: 8px;
          display: block;
          color: #cbd5e1;
        }
        .view-toggle button.active {
          background: #1e293b;
          color: #fff;
        }
        .view-toggle button:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      <aside className="sidebar glass">
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <h3>📂 Explorer</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {tree.length > 0 && (
                <>
                  <button className="view-all-btn" onClick={() => setExpandedPaths(new Set())}>
                    Collapse
                  </button>
                  <button className="view-all-btn" onClick={() => {
                    setSelectedFile("");
                    setViewMode("project");
                  }}>
                    🌐 Root
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="subtitle">Navigate your project like a real directory.</p>
        </div>

        <div className="sidebar-list">
          {tree.length === 0 ? (
            <div className="empty-state">Select a project folder to begin.</div>
          ) : (
            renderTree(tree)
          )}
        </div>

        <div className="ad-slot" style={{ padding: '12px', textAlign: 'center' }}>
          <div
            id="contextxode-ad"
            className="horizontal"
            data-ea-publisher="your_username_here"
            data-ea-type="image"
            style={{ width: '100%', minHeight: '100px' }}
          ></div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar glass">
          <div>
            <h1>⚡ ContextXode</h1>
            <p className="subtitle">Export your codebase into AI-ready context.</p>
          </div>

          <button className="primary-button" onClick={handleExport} disabled={loading}>
            {loading ? "Selecting..." : "Select Project Folder"}
          </button>
        </div>

        {path && (
          <div className="glass path-card">
            <span>📁 {path}</span>
          </div>
        )}

        {error && <div className="glass error-card">{error}</div>}

        <section className="glass section">
          <div className="section-header">
            <div>
              <h2>{viewMode === "file" ? "📄 File Preview" : "📦 Project Context"}</h2>
              <p className="subtitle">{viewMode === "file" ? "Viewing single file content." : "Viewing entire project structure and all files."}</p>
            </div>
            <div className="preview-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="view-toggle">
                <button 
                  className={viewMode === "project" ? "active" : ""} 
                  onClick={() => setViewMode("project")}
                >Project</button>
                <button 
                  className={viewMode === "file" ? "active" : ""} 
                  onClick={() => setViewMode("file")}
                  disabled={!selectedFile}
                >File</button>
              </div>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(viewMode === "file" ? selectedContent : fullContext)}
                disabled={viewMode === "file" ? !selectedContent : !fullContext}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="code-box">
            {viewMode === "file" && selectedFile ? (
              <>
                <div className="code-meta">{selectedFile}</div>
                <pre>{selectedContent}</pre>
              </>
            ) : fullContext ? (
              <>
                <div className="code-meta">Entire Project Context</div>
                <pre>{fullContext}</pre>
              </>
            ) : (
              <div className="empty-state">
                Select a project folder to generate the full context.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
