
import sys
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    tokens = re.finditer(r'<(/?[a-zA-Z0-9\.]+)([^>]*?)(/?)>', content)
    
    lines = content.split('\n')
    
    def get_line_no(offset):
        return content.count('\n', 0, offset) + 1

    for match in tokens:
        tag_full = match.group(0)
        tag_name = match.group(1)
        is_closing = tag_name.startswith('/')
        is_self_closing = match.group(3) == '/'
        
        if is_closing:
            clean_name = tag_name[1:]
            if clean_name in ['div', 'React.Fragment', 'ModalPortal']:
                if not stack:
                    print(f"Unexpected closing tag at line {get_line_no(match.start())}: {tag_full}")
                else:
                    stack.pop()
        elif is_self_closing:
            pass
        else:
            if tag_name in ['div', 'React.Fragment', 'ModalPortal']:
                stack.append((tag_name, get_line_no(match.start())))
                
    if stack:
        print("Unclosed tags:")
        for tag, line in stack:
            print(f"{tag} opened at line {line}")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
