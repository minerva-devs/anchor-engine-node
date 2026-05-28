import psycopg2

try:
    conn = psycopg2.connect(
        host='localhost',
        user='anchor',
        password='',
        dbname='anchor_engine'
    )
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM atoms WHERE provenance LIKE 'github:%';")
    result = cur.fetchone()
    print(f'Count: {result[0]}')
    cur.close()
    conn.close()
except Exception as e:
    print(f'Error: {e}')
