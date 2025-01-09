import React, { useMemo, memo } from "react";
import WordCloud from "react-d3-cloud";

const WordSuggestionCloud = memo(({ suggestion }) => {
  console.log("minhdz", suggestion);

  const words = useMemo(
    () =>
      suggestion
        .filter((s) => s.word !== "<|endoftext|>")
        .map((s) => ({
          text: s.word,
          value: Math.max(10, s.probability * 100000),
        })),
    [suggestion]
  );

  const fontSizeMapper = (word) => Math.log2(word.value) * 5;
  const rotate = () => 0;

  return (
    <div>
      <WordCloud data={words} fontSizeMapper={fontSizeMapper} rotate={rotate} />
    </div>
  );
});

export default WordSuggestionCloud;
