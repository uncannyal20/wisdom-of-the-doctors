import os
from html.parser import HTMLParser

class SyntaxValidator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        # We don't need to close self-closing tags in HTML5
        self_closing = {'img', 'br', 'hr', 'input', 'meta', 'link'}
        if tag not in self_closing:
            self.tags.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        self_closing = {'img', 'br', 'hr', 'input', 'meta', 'link'}
        if tag in self_closing:
            return
        if not self.tags:
            self.errors.append(f"Unexpected end tag </{tag}> at line {self.getpos()[0]}")
            return
        last_tag, pos = self.tags.pop()
        if last_tag != tag:
            self.errors.append(f"Mismatched tag: expected </{last_tag}> (opened at line {pos[0]}), found </{tag}> at line {self.getpos()[0]}")

def validate():
    file_path = os.path.join(os.path.dirname(__file__), '../wisdom-of-the-doctors.html')
    print(f"Validating HTML file: {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    parser = SyntaxValidator()
    parser.feed(html_content)

    print("\n--- Structural HTML Validation ---")
    if parser.errors:
        print(f"❌ Found {len(parser.errors)} structural errors:")
        for err in parser.errors[:10]:
            print(f"  - {err}")
    else:
        print("✅ HTML Tags are perfectly balanced!")

    # Check for unclosed open tags
    if parser.tags:
        print(f"❌ Found {len(parser.tags)} unclosed tags at the end of the file:")
        for tag, pos in parser.tags:
            print(f"  - <{tag}> opened at line {pos[0]}")
    else:
        print("✅ No unclosed tags remaining at the end of the file!")

if __name__ == "__main__":
    validate()
