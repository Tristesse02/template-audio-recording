import React from "react";
import WordCloud from "react-d3-cloud";

const WordSuggestionCloud = ({ suggestion }) => {
  console.log("minhdz", suggestion);
  const words = suggestion
    .filter((s) => s.word !== "<|endoftext|>")
    .map((s) => ({
      text: s.word,
      value: Math.max(10, s.probability * 100000),
    }));

  const fontSizeMapper = (word) => Math.log2(word.value) * 5;
  const rotate = () => (Math.random() > 0.5 ? 0 : 90);

  return (
    <div>
      <WordCloud data={words} fontSizeMapper={fontSizeMapper} rotate={rotate} />
    </div>
  );
};

export default WordSuggestionCloud;
