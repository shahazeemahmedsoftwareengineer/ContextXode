use std::fs;
use std::path::Path;

const MAX_FILE_SIZE: u64 = 300_000;

pub fn process_project(path: &str) -> (String, String) {
    let mut structure = String::from("# PROJECT STRUCTURE\n");
    let mut content = String::from("# PROJECT FILES\n");

    fn visit(dir: &Path, structure: &mut String, content: &mut String, depth: usize) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_name().unwrap().to_string_lossy();

                // Ignore unwanted
                let path_str = path.to_string_lossy();
                if path_str.contains("node_modules")
                    || path_str.contains(".git")
                    || path_str.contains("dist")
                    || path_str.contains("build")
                {
                    continue;
                }

                let indent = "  ".repeat(depth);

                if path.is_dir() {
                    structure.push_str(&format!("{}📁 {}\n", indent, name));
                    visit(&path, structure, content, depth + 1);
                } else {
                    structure.push_str(&format!("{}📄 {}\n", indent, name));

                    if let Ok(meta) = fs::metadata(&path) {
                        if meta.len() > MAX_FILE_SIZE {
                            continue;
                        }
                    }

                    if let Ok(file_content) = fs::read_to_string(&path) {
                        content.push_str(&format!(
                            "\n\n# FILE: {}\n--------------------\n{}\n",
                            path.display(),
                            file_content
                        ));
                    }
                }
            }
        }
    }

    visit(Path::new(path), &mut structure, &mut content, 0);

    (structure, content)
}
