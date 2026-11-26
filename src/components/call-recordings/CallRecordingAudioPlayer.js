"use client";

import React, { useState, useEffect, useRef } from "react";
import callRecordingApi from "@/services/callRecordingApi";

// Module-level reference so only one recording can play at a time across the entire page/modal.
let activeAudioEl = null;

function pauseOtherAudio(currentEl = null) {
  if (activeAudioEl && activeAudioEl !== currentEl) {
    try {
      activeAudioEl.pause();
    } catch (_) { }
  }
  if (typeof document !== "undefined") {
    document.querySelectorAll("audio").forEach((el) => {
      if (el !== currentEl && !el.paused) {
        try {
          el.pause();
        } catch (_) { }
      }
    });
  }
  activeAudioEl = currentEl || null;
}

export default function CallRecordingAudioPlayer({ recordingId, fileName = "Recording" }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (_) { }
        if (activeAudioEl === audioRef.current) {
          activeAudioEl = null;
        }
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const handleLoadAndPlay = async () => {
    pauseOtherAudio(null);
    if (blobUrl) return;
    setIsLoading(true);
    setError("");
    try {
      const url = await callRecordingApi.fetchAudioBlobUrl(recordingId);
      blobUrlRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load audio");
    } finally {
      setIsLoading(false);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  if (error) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="badge bg-danger-subtle text-danger">{error}</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0 px-2"
          onClick={handleLoadAndPlay}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 rounded-pill px-3"
        onClick={handleLoadAndPlay}
        disabled={isLoading}
        title={`Play ${fileName}`}
      >
        {isLoading ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <i className="bi bi-play-circle-fill"></i>
            <span>Play Recording</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <audio
        ref={audioRef}
        controls
        autoPlay
        src={blobUrl}
        onPlay={() => {
          if (audioRef.current) {
            pauseOtherAudio(audioRef.current);
            audioRef.current.playbackRate = playbackRate;
          }
        }}
        onPause={() => {
          if (activeAudioEl === audioRef.current) {
            activeAudioEl = null;
          }
        }}
        onEnded={() => {
          if (activeAudioEl === audioRef.current) {
            activeAudioEl = null;
          }
        }}
        style={{ height: "32px", maxWidth: "240px" }}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary px-2 py-0"
        onClick={cycleSpeed}
        title="Change playback speed"
        style={{ fontSize: "0.75rem", height: "28px" }}
      >
        {playbackRate}x
      </button>
    </div>
  );
}
