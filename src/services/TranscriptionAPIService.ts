import { Track } from "../types/Track";
import { APIServiceInterface } from "./APIServiceInterface";
import { extractFilenameFromContentDisposition, MIME_TO_EXT } from "./utils";

const API_BASE_URL = "https://api.softcatala.org/transcribe-service/v1";

export const loadVideoFromUUID = async (
  uuid: string
): Promise<{ url: string; contentType: string; filename: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=bin`
  );
  if (!response.ok) {
    throw new Error("Failed to load video");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const contentType = response.headers.get("content-type") || "video/mp4";

  const contentDisposition = response.headers.get("content-disposition");
  let filename = extractFilenameFromContentDisposition(contentDisposition);

  if (filename === "input") {
    const ext = MIME_TO_EXT[contentType] || "mp4";
    filename = `input.${ext}`;
  }

  return { url, contentType, filename };
};

export const loadTracksFromUUID = async (uuid: string): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/get_file/?uuid=${uuid}&ext=json`
  );
  if (!response.ok) {
    throw new Error("Failed to load tracks");
  }
  return response.json();
};

export const parseTracksFromJSON = (json: any): Track[] => {
  return json.segments.map((segment: any) => ({
    id: segment.id,
    start: segment.start,
    end: segment.end,
    speaker_id: segment.speaker || "",
    path: "",
    text: segment.text.trim(),
    for_dubbing: false,
    ssml_gender: "",
    translated_text: "",
    assigned_voice: "",
    pitch: 0,
    speed: 1,
    volume_gain_db: 0,
  }));
};

export const TranscriptionAPIService: APIServiceInterface = {
  loadVideoFromUUID,
  loadTracksFromUUID,
  parseTracksFromJSON,
};