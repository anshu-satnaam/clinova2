import chromadb
import asyncio

async def test():
    try:
        client = await chromadb.AsyncHttpClient(host='localhost', port=8005)
        hb = await client.heartbeat()
        print(f"Heartbeat: {hb}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
