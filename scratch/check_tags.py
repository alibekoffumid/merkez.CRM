
import sys
import re

def check_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    # Simplified: just count <div and </div across lines
    # Using re.DOTALL to match across lines
    
    pattern = re.compile(r'<(div|React\.Fragment|ModalPortal)|</(div|React\.Fragment|ModalPortal)>')
    
    # We also need to detect if a tag is self-closing
    # Let's use a more robust way: find all < and >
    
    tokens = re.finditer(r'<(/?[a-zA-Z0-9\.]+)([^>]*?)(/?)>', content)
    
    for match in tokens:
        tag_full = match.group(0)
        tag_name = match.group(1)
        is_closing = tag_name.startswith('/')
        is_self_closing = match.group(3) == '/'
        
        if is_closing:
            clean_name = tag_name[1:]
            if clean_name in ['div', 'React.Fragment', 'ModalPortal']:
                if not stack:
                    print(f"Unexpected closing tag: {tag_full}")
                else:
                    stack.pop()
        elif is_self_closing:
            pass
        else:
            if tag_name in ['div', 'React.Fragment', 'ModalPortal']:
                stack.append(tag_name)
                
    if stack:
        print("Unclosed tags:", stack)

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
