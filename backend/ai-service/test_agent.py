import asyncio
import os
from workflows.clinical_assessment import clinical_assessment_graph
import structlog
from dotenv import load_dotenv

load_dotenv()

async def test_workflow():
    print("🚀 Testing LangGraph Clinical Workflow...")
    
    # Mock input
    input_data = {
        "raw_input": "Patient reports severe chest pain and shortness of breath since this morning. History of hypertension.",
        "patient_id": "test-123",
        "session_id": "session-123"
    }
    
    try:
        print("Invoking graph...")
        result = await clinical_assessment_graph.ainvoke(input_data)
        print("\n✅ Workflow execution successful!")
        print(f"Risk Level: {result.get('risk_level')}")
        print(f"Entities: {result.get('medical_entities')}")
        print(f"Final Output keys: {result.get('final_output').keys() if result.get('final_output') else 'None'}")
    except Exception as e:
        print(f"\n❌ Workflow execution FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_workflow())
