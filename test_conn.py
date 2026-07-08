import asyncio, asyncpg
async def test():
    try:
        conn = await asyncpg.connect('postgresql://postgres.qtklmdyqsiwexjsklsah:_%2Cgg6mrM%2B%21%28%3FE%7E%2B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres')
        print('OK eu-central-1')
        await conn.close()
    except Exception as e:
        print('ERR eu-central-1:', e)

    try:
        conn = await asyncpg.connect('postgresql://postgres.qtklmdyqsiwexjsklsah:_%2Cgg6mrM%2B%21%28%3FE%7E%2B@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')
        print('OK ap-northeast-1')
        await conn.close()
    except Exception as e:
        print('ERR ap-northeast-1:', e)

asyncio.run(test())
