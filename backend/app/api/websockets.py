"""
WebSocket endpoints for real-time updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json

from app.api.v1.pipelines import _pipeline_executions

router = APIRouter()

# Store active WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ws/executions/{execution_id}")
async def websocket_execution_updates(websocket: WebSocket, execution_id: str):
    """
    WebSocket endpoint for real-time pipeline execution updates.
    Streams progress updates for a specific pipeline execution.
    """
    await websocket.accept()

    # Add to active connections
    if execution_id not in active_connections:
        active_connections[execution_id] = set()
    active_connections[execution_id].add(websocket)

    try:
        # Send initial status
        if execution_id in _pipeline_executions:
            await websocket.send_json(_pipeline_executions[execution_id])

        # Stream updates while execution is running
        while True:
            if execution_id in _pipeline_executions:
                status = _pipeline_executions[execution_id]
                await websocket.send_json(status)

                # If completed or failed, close connection after sending final status
                if status["status"] in ["completed", "failed"]:
                    await asyncio.sleep(1)  # Give client time to process
                    break

            # Wait before next update
            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Remove from active connections
        if execution_id in active_connections:
            active_connections[execution_id].discard(websocket)
            if not active_connections[execution_id]:
                del active_connections[execution_id]


async def broadcast_execution_update(execution_id: str, status: dict):
    """
    Broadcast an execution update to all connected clients.
    This can be called from the pipeline execution task.
    """
    if execution_id in active_connections:
        disconnected = set()
        for websocket in active_connections[execution_id]:
            try:
                await websocket.send_json(status)
            except Exception:
                disconnected.add(websocket)

        # Clean up disconnected websockets
        for ws in disconnected:
            active_connections[execution_id].discard(ws)
