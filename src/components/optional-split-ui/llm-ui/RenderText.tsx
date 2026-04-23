"use client";
import React, { useEffect, useState } from "react";
import {
  codeBlockLookBack,
  findCompleteCodeBlock,
  findPartialCodeBlock,
} from "@llm-ui/code";
import { markdownLookBack } from "@llm-ui/markdown";
import { useLLMOutput } from "@llm-ui/react";
import { MarkdownComponent } from "@/components/optional-split-ui/llm-ui/CodeBlockRenderer";
import { CodeBlock } from "@/components/optional-split-ui/llm-ui/MarkdownRenderer";

const RenderText = ({ llmOutput }: { llmOutput: string }) => {
  const [streamingOutput, setStreamingOutput] = useState<string>("");
  const [isStreamFinished, setIsStreamFinished] = useState<boolean>(false);

  // Simulate streaming output by progressively updating `streamingOutput`
  useEffect(() => {
    let currentIndex = 0;
    const charsPerInterval = 3; // Number of characters to add per interval
    const intervalSpeed = 20; // Interval duration in milliseconds

    const interval = setInterval(() => {
      if (currentIndex < llmOutput.length) {
        setStreamingOutput((prev) =>
          prev + llmOutput.slice(currentIndex, currentIndex + charsPerInterval)
        );
        currentIndex += charsPerInterval;
      } else {
        setIsStreamFinished(true); // Mark streaming as finished
        clearInterval(interval);
      }
    }, intervalSpeed); // Faster intervals

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [llmOutput]);

  const { blockMatches } = useLLMOutput({
    llmOutput: streamingOutput, // Use streaming output
    isStreamFinished, // Pass the streaming status
    fallbackBlock: {
      component: MarkdownComponent, // Fallback for general markdown
      lookBack: markdownLookBack(),
    },
    blocks: [
      {
        component: CodeBlock, // Renders syntax-highlighted code blocks
        findCompleteMatch: findCompleteCodeBlock(),
        findPartialMatch: findPartialCodeBlock(),
        lookBack: codeBlockLookBack(),
      },
    ],
  });

  return (
    <div>
      {blockMatches.map((blockMatch, index) => {
        const Component = blockMatch.block.component;
        return <Component key={index} blockMatch={blockMatch} />;
      })}
    </div>
  );
};

export default RenderText;