import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import WordSuggestionCloud from "./WordCloud";
import styles from "./styles.module.css";

const App = () => {
  const [status, setStatus] = useState("Not recording");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [suggestion, setSuggestion] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [audioInput, setAudioInput] = useState(null);
  const [processor, setProcessor] = useState(null);
  const [pendingText, setPendingText] = useState("");
  const [typingSpeed, setTypingSpeed] = useState(20);
  const [, setFullTranscript] = useState("");

  const socketRef = useRef();

  // Function to send the transcript to the predict endpoint
  const sendToPredictEndpoint = async (transcript) => {
    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript.trim() }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        setSuggestion(suggestions["suggestion"]);
      } else {
        setSuggestion([]);
      }
    } catch (error) {
      console.error("Error sending to predict endpoint:", error);
    }
  };

  useEffect(() => {
    socketRef.current = io("http://localhost:4000");

    socketRef.current.on("transcription", async (data) => {
      if (data.isFinal) {
        setFullTranscript((prev) => {
          const updatedTranscript = prev + data.text + " ";
          sendToPredictEndpoint(
            updatedTranscript[updatedTranscript.length - 2] === "."
              ? updatedTranscript.slice(0, -2)
              : updatedTranscript
          );
          return updatedTranscript;
        });
        setPendingText((prev) => prev + data.text + " ");
      }
    });

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    if (pendingText.length > 0) {
      const timer = setTimeout(() => {
        setCurrentTranscript((prev) => prev + pendingText[0]);
        setPendingText((prev) => prev.slice(1));
      }, typingSpeed);

      return () => clearTimeout(timer);
    }
  }, [pendingText, typingSpeed]);

  const startRecording = async () => {
    console.log("is it working?");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      await context.audioWorklet.addModule("/audioProcessor.js");

      const audioWorkletNode = new AudioWorkletNode(
        context,
        "audio-processor",
        {
          processorOptions: { bufferSize: 2048 },
        }
      );

      const input = context.createMediaStreamSource(stream);
      input.connect(audioWorkletNode);

      audioWorkletNode.port.onmessage = (event) => {
        const audioData = event.data;
        socketRef.current.emit("audioData", audioData);
      };

      setAudioContext(context);
      setAudioInput(input);
      setProcessor(audioWorkletNode);
      socketRef.current.emit("startTranscription");
      setStatus("Recording");
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (audioContext && audioContext.state !== "closed") {
      audioInput.disconnect();
      processor.disconnect();
      audioContext.close();
      socketRef.current.emit("stopTranscription");
      setStatus("Not recording");
    }
  };

  const clearTranscript = () => {
    setCurrentTranscript("");
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Real-time Audio Transcription</h1>
        <div className={styles.status}>
          <span>Status: {status}</span>
          <span className={`${styles.statusIndicator}`}>
            {status === "Recording" ? "🔴" : "⚪"}
          </span>
        </div>
        <div className={styles.buttonContainer}>
          <button
            onClick={startRecording}
            className={`${styles.button} ${styles.startButton}`}
          >
            Start Transcription
          </button>
          <button
            onClick={stopRecording}
            className={`${styles.button} ${styles.stopButton}`}
          >
            Stop Transcription
          </button>
          <button
            onClick={clearTranscript}
            className={`${styles.button} ${styles.clearButton}`}
          >
            Clear Transcript
          </button>
        </div>
        <div className={styles.transcript}>{currentTranscript}</div>
        <div>Word Cloud section</div>
        <div className="mt-6">
          <WordSuggestionCloud suggestion={suggestion} />
        </div>
        <footer className={styles.footer}>
          © 2024 Your Company. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
};

export default App;
