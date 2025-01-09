import React, { useEffect, useState, useRef, use } from "react";
import { io } from "socket.io-client";
import "./App.css";
import WordSuggestionCloud from "./WordCloud";

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

  const socketRef = useRef(); // Ref to store the socket object

  // Function to send the transcript to the predict endpoint
  const sendToPredictEndpoint = async (transcript) => {
    try {
      console.log("baodangdz", transcript);
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcript.trim() }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        console.log("Received suggestions:", suggestions["suggestion"]);
        setSuggestion(suggestions["suggestion"]);
      } else {
        console.error("Failed to fetch suggestions");
        setSuggestion([]);
      }
    } catch (error) {
      console.error("Error sending to predict endpoint:", error);
    }
  };

  useEffect(() => {
    socketRef.current = io("http://localhost:4000");
    // Handle transcription events from the backend
    socketRef.current.on(
      "transcription",
      async (data) => {
        console.log("Received transcription:", data);
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
          // Update the transcript and send the updated transcript to the predict endpoint
          setPendingText((prev) => prev + data.text + " ");
        }
        // else {
        //   setSuggestion([]);
        // }
      },
      []
    );

    socketRef.current.on("error", (errorMessage) => {
      console.error("Server error:", errorMessage);
      // document.getElementById("transcript").textContent +=
      //   "\nError: " + errorMessage;
    });
  }, []);

  useEffect(() => {
    if (pendingText.length > 0) {
      const timer = setTimeout(() => {
        setCurrentTranscript((prev) => prev + pendingText[0]);
        setPendingText((prev) => prev.slice(1));
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else {
      console.log("not here");
    }
  }, [pendingText, typingSpeed]);

  const startRecording = async () => {
    console.log("Start button clicked");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");

      const context = new AudioContext();
      await context.audioWorklet.addModule("/audioProcessor.js"); // Ensure this loads

      const audioWorkletNode = new AudioWorkletNode(
        context,
        "audio-processor",
        { processorOptions: { bufferSize: 2048 } }
      );

      // Connect the microphone to the worklet
      const input = context.createMediaStreamSource(stream);
      input.connect(audioWorkletNode);

      // Debug: Listen for audio data
      audioWorkletNode.port.onmessage = (event) => {
        const audioData = event.data;
        socketRef.current.emit("audioData", audioData);
      };

      setAudioContext(context);
      setAudioInput(input);
      setProcessor(audioWorkletNode);
      socketRef.current.emit("startTranscription");
      console.log("startTranscription event emitted");
      updateStatus("Recording");
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    console.log("Stop button clicked");
    if (audioContext && audioContext.state !== "closed") {
      audioInput.disconnect();
      processor.disconnect();
      audioContext.close();
      socketRef.current.emit("stopTranscription");
      // socketRef.current.disconnect();
      updateStatus("Not recording");
    }
  };

  const clearTranscript = () => {
    console.log("Clear button clicked");
    setCurrentTranscript("");
    document.getElementById("transcript").textContent = "";
  };

  const updateStatus = (newStatus) => {
    console.log("Status updated:", newStatus);
    setStatus(newStatus);
    const statusIndicator = document.getElementById("statusIndicator");
    if (statusIndicator) {
      statusIndicator.textContent = newStatus === "Recording" ? "🔴" : "⚪";
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <h1>Real-time Audio Transcription</h1>
        <div className="status">
          Status: <span id="status">{`\u00A0${status}`}</span>
          <span id="statusIndicator">⚪</span>
        </div>
        <div className="button-container">
          <button id="startButton" onClick={startRecording}>
            Start Transcription
          </button>
          <button id="stopButton" onClick={stopRecording}>
            Stop Transcription
          </button>
          <button id="clearButton" onClick={clearTranscript}>
            Clear Transcript
          </button>
        </div>
        <div id="transcript" className="transcript-box">
          {currentTranscript}
        </div>
        <div>Word Cloud section</div>
        <WordSuggestionCloud suggestion={suggestion} />
        <div className="footer">
          <p>© 2024 Your Company. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
