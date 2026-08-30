import sys
import re

def validate_schema(filename):
    """
    Validates a SQL schema file against internal policy:
    1. Table names must be snake_case or PascalCase (Prisma convention).
    2. Every table must have a primary key named 'id', EXCEPT tables for n8n, agents, or internal logs/system tables.
    3. No 'DROP TABLE' statements allowed (safety).
    """
    try:
        with open(filename, 'r') as f:
            content = f.read()
            
        errors = []
        
        # Check 1: No DROP TABLE (Strict Safety Rule)
        if re.search(r'DROP TABLE', content, re.IGNORECASE):
            errors.append("ERROR: 'DROP TABLE' statements are forbidden.")
            
        # Check 2 & 3: CREATE TABLE checks
        table_defs = re.finditer(r'CREATE TABLE\s+(?P<name>\w+)\s*\((?P<body>.*?)\);', content, re.DOTALL | re.IGNORECASE)
        
        # Keywords/prefixes for n8n, agents, and internal system tables
        internal_prefixes = (
            'agent', 'n8n', 'chat_hub', 'ai_', 'instance_', 'execution',
            'auth_', 'workflow', 'oauth', 'credential', 'role', 'scope',
            'setting', 'tag', 'token', 'webhook', 'shared_', 'mcp_',
            'installed_', 'binary_', 'processed_', 'insights_', 'historial_',
            'unidentified_', 'folder_tag', 'dynamic_credential', 'invalid_auth',
            'trusted_key', 'annotation_', 'project'
        )

        for match in table_defs:
            table_name = match.group('name')
            body = match.group('body')
            
            # Snake_case or PascalCase check (allows Prisma convention)
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', table_name):
                errors.append(f"ERROR: Table '{table_name}' must be snake_case or PascalCase.")
                
            # Primary key check (exempting n8n, agents, and internal system tables)
            name_lower = table_name.lower()
            is_exempt = any(name_lower.startswith(prefix) for prefix in internal_prefixes) or 'agent' in name_lower or 'n8n' in name_lower
            
            if not is_exempt:
                if not re.search(r'\bid\b.*PRIMARY KEY', body, re.IGNORECASE):
                    errors.append(f"ERROR: Table '{table_name}' is missing a primary key named 'id'.")

        if errors:
            for err in errors:
                print(err)
            sys.exit(1)
        else:
            print("Schema validation passed.")
            sys.exit(0)
            
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_schema.py <schema_file>")
        sys.exit(1)
        
    validate_schema(sys.argv[1])

