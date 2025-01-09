import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";
import WordSuggestionCloud from "./WordCloud";

const App = () => {
  const [status, setStatus] = useState(" Not recording");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [suggestion, setSuggestion] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [audioInput, setAudioInput] = useState(null);
  const [processor, setProcessor] = useState(null);

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
    socketRef.current.on("transcription", async (data) => {
      console.log("Received transcription:", data);
      if (data.isFinal) {
        // Update the transcript and send the updated transcript to the predict endpoint
        setCurrentTranscript((prev) => {
          const updatedTranscript = prev + data.text.replace(".", " ") + " ";
          console.log("Updated transcript in callback:", updatedTranscript);

          // Send the updated transcript to the predict endpoint
          sendToPredictEndpoint(updatedTranscript);

          return updatedTranscript;
        });
      } else {
        setSuggestion([]);
      }
    });

    socketRef.current.on("error", (errorMessage) => {
      console.error("Server error:", errorMessage);
      // document.getElementById("transcript").textContent +=
      //   "\nError: " + errorMessage;
    });
  }, []);

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
      updateStatus(" Not recording");
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
      statusIndicator.textContent = newStatus === " Recording" ? "🔴" : "⚪";
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <h1>Real-time Audio Transcription</h1>
        <div className="status">
          Status: <span id="status">{status}</span>
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
