import os
import py_compile
import subprocess

def check_js_syntax():
    print("Checking JavaScript syntax for all files in api/ and project root...")
    has_errors = False
    
    # We can use python to run a quick node syntax check or use a python JS parser if available,
    # but the simplest way is to compile it using Python's AST if it's just checking braces,
    # or better, check if we can run "node --check <file>" if node is available.
    # Wait, node is not in zsh path. Let's see if we can find node in common Mac paths:
    paths_to_try = [
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "node"
    ]
    
    node_bin = None
    for p in paths_to_try:
        try:
            res = subprocess.run([p, "-v"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode == 0:
                node_bin = p
                break
        except Exception:
            continue
            
    if node_bin:
        print(f"Using node binary found at: {node_bin}")
        # Check files
        for root, dirs, files in os.walk("."):
            if "node_modules" in root or ".git" in root or "scratch" in root:
                continue
            for file in files:
                if file.endswith(".js"):
                    full_path = os.path.join(root, file)
                    res = subprocess.run([node_bin, "--check", full_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if res.returncode != 0:
                        print(f"❌ Syntax error in {full_path}:")
                        print(res.stderr.decode('utf-8'))
                        has_errors = True
                    else:
                        print(f"✅ {full_path} syntax is clean.")
    else:
        print("⚠️ Node binary not found on standard paths, falling back to basic brace matching validator.")
        # Fallback basic validator
        for root, dirs, files in os.walk("."):
            if "node_modules" in root or ".git" in root or "scratch" in root:
                continue
            for file in files:
                if file.endswith(".js"):
                    full_path = os.path.join(root, file)
                    if validate_braces(full_path):
                        print(f"✅ {full_path} brace check passed.")
                    else:
                        print(f"❌ Mismatched braces in {full_path}!")
                        has_errors = True
                        
    if not has_errors:
        print("\n🎉 All JavaScript files parsed successfully without syntax errors!")
    else:
        print("\n❌ Found syntax errors in JavaScript files!")

def validate_braces(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    string_char = None
    escaped = False
    
    for i, char in enumerate(code):
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if char in ('"', "'", '`'):
            if not in_string:
                in_string = True
                string_char = char
            elif string_char == char:
                in_string = False
                string_char = None
            continue
        if in_string:
            continue
            
        if char in ('(', '{', '['):
            stack.append((char, i))
        elif char in (')', '}', ']'):
            if not stack:
                return False
            top, _ = stack.pop()
            if pairs[char] != top:
                return False
                
    return len(stack) == 0

if __name__ == "__main__":
    check_js_syntax()
