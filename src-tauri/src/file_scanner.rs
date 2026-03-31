use std::fs;
use std::path::Path;

pub fn scan_and_read(path: &str) -> String {
    let mut output = String::new();

    fn visit_dirs(dir: &Path, output: &mut String) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if path.is_dir() {
                    visit_dirs(&path, output);
                } else if let Some(p) = path.to_str() {
                    if p.contains("node_modules") || p.contains(".git") {
                        continue;
                    }

                    output.push_str(&format!(
                        "\n\n# FILE: {}\n--------------------\n",
                        p
                    ));

                    match fs::read_to_string(&path) {
                        Ok(content) => output.push_str(&content),
                        Err(_) => output.push_str("[Could not read file]"),
                    }
                }
            }
        }
    }

    output.push_str("# PROJECT EXPORT\n");
    visit_dirs(Path::new(path), &mut output);
    output
}
