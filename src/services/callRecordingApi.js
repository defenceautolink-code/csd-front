import api from "@/lib/axios";

export const callRecordingApi = {
  /**
   * Fetch daily summary (per-staff audit for Admin/Manager, or own stats + follow-ups for Staff).
   */
  getSummary: async (params = {}) => {
    const response = await api.get("/call-recordings/summary", { params });
    return response.data;
  },

  /**
   * Fetch paginated or filtered list of call recordings.
   */
  getRecordings: async (params = {}) => {
    const response = await api.get("/call-recordings", { params });
    return response.data;
  },

  /**
   * Fetch a specific staff member's follow-ups and uploaded recordings for a date/range.
   */
  getStaffDetail: async (userId, params = {}) => {
    const response = await api.get(`/call-recordings/staff/${userId}`, { params });
    return response.data;
  },

  /**
   * Bulk upload multiple audio files under a single batch ID with live per-file progress updates.
   * Uploads strictly 1 file per request sequentially so each recording's progress & validation
   * is tracked individually without hitting server size/timeout limits.
   */
  uploadBatch: async (files, metadata = {}, onProgress = null) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) {
      throw new Error("Please select at least one audio file.");
    }

    const batchId =
      metadata.batch_id ||
      `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const chunkSize = 1;
    const uploadedRecords = [];
    const errors = [];
    let completed = 0;

    for (let i = 0; i < fileList.length; i += chunkSize) {
      const chunk = fileList.slice(i, i + chunkSize);
      const activeFile = chunk[0];

      if (typeof onProgress === "function") {
        onProgress({
          phase: "uploading",
          currentIndex: i,
          currentFileName: activeFile?.name || "",
          completed,
          total: fileList.length,
          percent: Math.round((completed / fileList.length) * 100),
        });
      }

      const formData = new FormData();

      if (metadata.recording_date) {
        formData.append("recording_date", metadata.recording_date);
      }
      if (metadata.notes) {
        formData.append("notes", metadata.notes);
      }
      if (metadata.lead_id) {
        formData.append("lead_id", String(metadata.lead_id));
      }
      if (metadata.follow_up_id) {
        formData.append("follow_up_id", String(metadata.follow_up_id));
      }
      formData.append("batch_id", batchId);

      chunk.forEach((file) => {
        formData.append("files[]", file);
      });

      try {
        const res = await api.post("/call-recordings", formData);
        if (res.data?.status && Array.isArray(res.data?.data)) {
          uploadedRecords.push(...res.data.data);
        }
        completed += chunk.length;
        if (typeof onProgress === "function") {
          onProgress({
            phase: "uploaded",
            currentIndex: i,
            currentFileName: activeFile?.name || "",
            completed,
            total: fileList.length,
            percent: Math.round((completed / fileList.length) * 100),
          });
        }
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to upload recording.";
        errors.push({
          files: chunk.map((f) => f.name),
          message: msg,
        });
        completed += chunk.length;
        if (typeof onProgress === "function") {
          onProgress({
            phase: "failed",
            currentIndex: i,
            currentFileName: activeFile?.name || "",
            errorMessage: msg,
            completed,
            total: fileList.length,
            percent: Math.round((completed / fileList.length) * 100),
          });
        }
      }
    }

    return {
      status: uploadedRecords.length > 0 && errors.length === 0,
      partial: uploadedRecords.length > 0 && errors.length > 0,
      batch_id: batchId,
      uploaded_count: uploadedRecords.length,
      data: uploadedRecords,
      errors,
    };
  },

  /**
   * Verify or Flag a call recording (Admin & Sales Manager).
   */
  reviewRecording: async (id, { review_status, review_remark = "" }) => {
    const response = await api.post(`/call-recordings/${id}/review`, {
      review_status,
      review_remark,
    });
    return response.data;
  },

  /**
   * Delete a call recording.
   */
  deleteRecording: async (id) => {
    const response = await api.delete(`/call-recordings/${id}`);
    return response.data;
  },

  /**
   * Delete (or preview count with dryRun=true) all recordings older than 1 month.
   */
  deleteOlderThanMonth: async (dryRun = false) => {
    const response = await api.post("/call-recordings/delete-older-than-month", {
      dry_run: dryRun,
    });
    return response.data;
  },

  /**
   * Fetch authenticated audio stream as an Object URL for safe playback.
   */
  fetchAudioBlobUrl: async (id) => {
    const response = await api.get(`/call-recordings/${id}/stream`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};

export default callRecordingApi;
