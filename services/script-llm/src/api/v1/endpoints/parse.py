"""API endpoint for parsing multilingual tagged script text."""

from fastapi import APIRouter, status
from src.schemas.parse import ParseRequest, ParseResponse
from src.services.script_tokenizer import parse_tagged_script

router = APIRouter()


@router.post(
    "/parse",
    response_model=ParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse tagged script into structured chunks and pairs",
    description="Extracts [VI], [EN], [JA] tagged sentences, normalizes whitespace and synthesizes shadowing pairs.",
)
async def parse_script_endpoint(request: ParseRequest) -> ParseResponse:
    """Parse raw script text into sequential ScriptChunk items and ChunkPair models."""
    chunks, pairs = parse_tagged_script(
        raw_text=request.raw_text,
        default_target_lang=request.target_lang or "en",
        generate_pairs=request.generate_pairs,
    )

    return ParseResponse(
        success=True,
        total_chunks=len(chunks),
        total_pairs=len(pairs),
        chunks=chunks,
        pairs=pairs,
        raw_char_count=len(request.raw_text),
    )
