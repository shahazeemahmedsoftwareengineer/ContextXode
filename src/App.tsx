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
  const [viewMode, setViewMode] = useState<"landing" | "app" | "privacy">("landing");
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
      setViewMode("app");
      setAppViewMode("project");
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
              setAppViewMode("file");
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

  if (viewMode === "landing") {
    return (
      <div className="landing-page dark-theme">
        <style>{`
          /* Premium Landing Page CSS */
          .landing-page {
            min-height: 100vh;
            background: radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%);
            color: #f8fafc;
            font-family: 'Inter', system-ui, sans-serif;
            overflow-x: hidden;
          }

          .nav-bar {
            padding: 1.5rem 4rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .logo-container { font-size: 1.5rem; font-weight: 800; color: #a5b4fc; display: flex; align-items: center; gap: 0.5rem; }
          .nav-links { display: flex; gap: 2rem; align-items: center; }
          .nav-links a { color: #94a3b8; text-decoration: none; transition: color 0.3s; cursor: pointer; }
          .nav-links a:hover { color: #fff; }

          .hero {
            padding: 8rem 4rem;
            text-align: center;
            max-width: 1000px;
            margin: 0 auto;
            position: relative;
          }

          .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            z-index: -1;
          }

          .hero h1 {
            font-size: 5rem;
            font-weight: 900;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
          }

          .hero p {
            font-size: 1.25rem;
            color: #94a3b8;
            margin-bottom: 3rem;
            line-height: 1.6;
          }

          .cta-group { display: flex; gap: 1.5rem; justify-content: center; }
          .cta-btn {
            padding: 1rem 2rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
          }

          .btn-primary { background: #6366f1; color: white; border: none; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4); }
          .btn-primary:hover { background: #4f46e5; transform: translateY(-2px); }
          .btn-secondary { background: #1e293b; color: #f8fafc; border: 1px solid #334155; }
          .btn-secondary:hover { background: #334155; border-color: #475569; transform: translateY(-2px); }

          .features {
            padding: 8rem 4rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .feature-card {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(148, 163, 184, 0.1);
            padding: 2rem;
            border-radius: 20px;
            text-align: left;
            transition: transform 0.3s, border-color 0.3s;
          }

          .feature-card:hover { transform: translateY(-10px); border-color: rgba(99, 102, 241, 0.4); }
          .feature-icon { font-size: 2rem; margin-bottom: 1rem; }
          .feature-card h3 { font-size: 1.25rem; margin-bottom: 0.75rem; color: #fff; }
          .feature-card p { color: #94a3b8; line-height: 1.6; }

          .footer {
            padding: 4rem;
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            color: #64748b;
          }
          .footer-links { display: flex; gap: 2rem; }
          .footer-links a { color: inherit; text-decoration: none; cursor: pointer; }
          .footer-links a:hover { color: #fff; }

          @media (max-width: 768px) {
            .hero h1 { font-size: 3rem; }
            .cta-group { flex-direction: column; align-items: center; }
            .nav-bar { padding: 1.5rem 2rem; }
          }
        `}</style>

        <nav className="nav-bar">
          <div className="logo-container">⚡ ContextXode</div>
          <div className="nav-links">
            <a onClick={() => setViewMode("landing")}>Home</a>
            <a onClick={() => setViewMode("app")}>Launch App</a>
            <a href="#download" className="cta-btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Get Started</a>
          </div>
        </nav>

        <main>
          <section className="hero">
            <h1>Supercharge Your AI Context</h1>
            <p>The developer-first tool to scan, analyze, and export your entire codebase into AI-ready prompts instantly. Run completely offline, secure by default.</p>
            <div className="cta-group" id="download">
              <a href="/ContextXode_Setup.exe" download className="cta-btn btn-primary">
                <span>🪟</span> Download for Windows (.exe)
              </a>
              <a href="/ContextXode_Setup.msi" download className="cta-btn btn-secondary">
                <span>📦</span> Download MSI Installer
              </a>
            </div>
            <div style={{ marginTop: '3rem' }}>
              <button onClick={() => setViewMode("app")} className="cta-btn btn-secondary" style={{ margin: '0 auto' }}>
                🚀 Try Online Edition
              </button>
            </div>
          </section>

          <section className="features">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>100% Offline & Private</h3>
              <p>Everything stays on your machine. No cloud uploads, no tracking, no data collection. Just pure privacy.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>AI-Ready Context</h3>
              <p>Scan your files and get a perfectly formatted prompt with project structure and file contents ready for your favorite LLM.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3>VS Code Experience</h3>
              <p>Browse your project tree with a familiar explorer interface. Choose exactly what you want to include in your context.</p>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div>© 2026 ContextXode. Built for developers by developers.</div>
          <div className="footer-links">
            <a onClick={() => setViewMode("privacy")}>Privacy Policy</a>
            <a href="https://github.com">GitHub</a>
          </div>
        </footer>
      </div>
    );
  }

  if (viewMode === "privacy") {
    return (
      <div className="landing-page privacy-view">
        <style>{`
          .privacy-content {
            max-width: 800px;
            margin: 6rem auto;
            padding: 4rem;
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 24px;
            line-height: 1.8;
            color: #e2e8f0;
          }
          .privacy-content h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #fff; }
          .privacy-content .date { color: #64748b; margin-bottom: 3rem; font-size: 0.9rem; }
          .privacy-content h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; color: #a5b4fc; }
          .privacy-content p { color: #94a3b8; }
          .back-btn { margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.5rem; color: #6366f1; cursor: pointer; text-decoration: none; font-weight: 600; }
          .back-btn:hover { text-decoration: underline; }
          .summary-card {
            margin-top: 3rem;
            padding: 1.5rem;
            background: rgba(99, 102, 241, 0.1);
            border-left: 4px solid #6366f1;
            border-radius: 8px;
          }
          .summary-card strong { color: #fff; }
        `}</style>

        <nav className="nav-bar">
          <div className="logo-container" onClick={() => setViewMode("landing")} style={{ cursor: 'pointer' }}>⚡ ContextXode</div>
          <div className="nav-links">
            <a onClick={() => setViewMode("landing")}>Home</a>
            <a onClick={() => setViewMode("app")}>Launch App</a>
          </div>
        </nav>

        <div className="privacy-content">
          <a onClick={() => setViewMode("landing")} className="back-btn">← Back to Home</a>
          <h1>Privacy Policy</h1>
          <div className="date">Last updated: April 2, 2026</div>

          <p>ContextXode respects your privacy. This application is designed to work completely offline and does not collect or share any personal data.</p>

          <h2>1. No Data Collection</h2>
          <p>ContextXode does not collect, store, or transmit any personal information. All data used by the application stays on your device.</p>

          <h2>2. Offline Usage</h2>
          <p>This application works entirely offline. It does not require an internet connection to function and does not communicate with any external servers.</p>

          <h2>3. Local File Access</h2>
          <p>ContextXode may access files on your device only to perform its core features (such as scanning or processing files). This data is never sent outside your system.</p>

          <h2>4. No Third-Party Services</h2>
          <p>This application does not use any third-party analytics, tracking tools, or external services.</p>

          <h2>5. Data Security</h2>
          <p>Since all data stays on your device, you are in full control of your information.</p>

          <h2>6. Changes to This Policy</h2>
          <p>If this policy is updated in the future, the updated version will be included with the application.</p>

          <h2>7. Contact</h2>
          <p>If you have any questions about this Privacy Policy, you can contact the developer.</p>

          <div className="summary-card">
            <strong>Summary:</strong> ContextXode does not collect your data. Everything stays private and on your device.
          </div>
        </div>

        <footer className="footer" style={{ border: 'none' }}>
          <div>© 2026 ContextXode. Built with privacy in mind.</div>
          <div className="footer-links">
            <a onClick={() => setViewMode("landing")}>Back Home</a>
          </div>
        </footer>
      </div>
    );
  }

  // APP VIEW (Previous Dashboard)
  const [appViewMode, setAppViewMode] = useState<"project" | "file">("project");
  
  // Note: We need a way to go back to landing from the app
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
                    setAppViewMode("project");
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
      </aside>

      <main className="main">
        <div className="topbar glass">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setViewMode("landing")} className="view-all-btn" style={{ padding: '4px 10px' }}>← Close</button>
              <h1>⚡ ContextXode</h1>
            </div>
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
              <h2>{appViewMode === "file" ? "📄 File Preview" : "📦 Project Context"}</h2>
              <p className="subtitle">{appViewMode === "file" ? "Viewing single file content." : "Viewing entire project structure and all files."}</p>
            </div>
            <div className="preview-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="view-toggle">
                <button 
                  className={appViewMode === "project" ? "active" : ""} 
                  onClick={() => setAppViewMode("project")}
                >Project</button>
                <button 
                  className={appViewMode === "file" ? "active" : ""} 
                  onClick={() => setAppViewMode("file")}
                  disabled={!selectedFile}
                >File</button>
              </div>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(appViewMode === "file" ? selectedContent : fullContext)}
                disabled={appViewMode === "file" ? !selectedContent : !fullContext}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="code-box">
            {appViewMode === "file" && selectedFile ? (
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
