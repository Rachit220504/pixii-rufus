import { Request, Response } from "express";
import { queryEngine } from "../services/queryEngine";

export async function chat(req: Request, res: Response) {
  try {
    const { query, previousContext } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query is required and must be a string",
      });
    }

    console.log(`[ChatController] Chat request: "${query}"`);

    const result = await queryEngine.chat(query, previousContext);

    console.log(`[ChatController] Chat response generated successfully`);

    return res.json({
      success: true,
      data: {
        response: result.response,
        recommendations: result.recommendations,
      },
    });

  } catch (error) {
    console.error("[ChatController] Chat error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Chat failed",
    });
  }
}
