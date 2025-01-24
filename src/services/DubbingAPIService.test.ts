import { DubbingAPIService, DubbingJSON } from "./DubbingAPIService";
import { speakerService } from "./SpeakerService";
import { matxaSynthesisProvider } from "./MatxaSynthesisProvider";

// Mock the SpeakerService
jest.mock("./SpeakerService", () => ({
  speakerService: {
    setSpeaker: jest.fn(),
    sortSpeakers: jest.fn(),
    getSpeakerById: jest.fn(),
  },
}));

// Mock the MatxaSynthesisProvider
jest.mock("./MatxaSynthesisProvider", () => ({
  matxaSynthesisProvider: {
    getVoice: jest.fn().mockReturnValue("mockedVoice"),
  },
}));

// Mock the react-i18next
jest.mock("react-i18next", () => ({
  getI18n: () => ({
    t: jest.fn().mockReturnValue("Speaker"),
  }),
}));

describe("DubbingAPIService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseTracksFromJSON", () => {
    it("should parse valid dubbing JSON data", async () => {
      const mockData: DubbingJSON[] = [
        {
          id: 1,
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "path/to/audio.mp3",
          text: "Hello, world!",
          for_dubbing: true,
          gender: "Female",
          translated_text: "Hola, mundo!",
          assigned_voice: "voice1",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
          dubbed_path: "path/to/dubbed/audio.mp3",
        },
      ];

      const result = await DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        start: 0,
        end: 5,
        speaker_id: "SPEAKER_01",
        path: "path/to/audio.mp3",
        text: "Hello, world!",
        original_text: "Hello, world!",
        original_translated_text: "Hola, mundo!",
        for_dubbing: true,
        ssml_gender: "Female",
        translated_text: "Hola, mundo!",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
        dubbed_path: "path/to/dubbed/audio.mp3",
        chunk_size: 0,
        needsResynthesis: false,
      });
      expect(speakerService.setSpeaker).toHaveBeenCalledWith({
        id: "SPEAKER_01",
        name: "Speaker 01",
        voice: "mockedVoice",
      });
    });

    it("should handle missing properties", async () => {
      const mockData = [
        {
          id: "1",
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
        },
      ];

      const result = await DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "",
          text: "",
          for_dubbing: false,
          ssml_gender: "",
          translated_text: "",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
          needsResynthesis: false,
        })
      );
      expect(speakerService.setSpeaker).toHaveBeenCalledWith({
        id: "SPEAKER_01",
        name: "Speaker 01",
        voice: "mockedVoice",
      });
    });

    it("should throw an error for invalid input", async () => {
      const mockData = { invalid: "data" };

      await expect(
        DubbingAPIService.parseTracksFromJSON(mockData as any)
      ).rejects.toThrow("utterances is not iterable");
    });
  });

  describe("loadTracksFromUUID", () => {
    it("should load tracks data correctly", async () => {
      const mockData = {
        utterances: [{ id: "1", start: 0, end: 5 }],
        source_language: "en",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await DubbingAPIService.loadTracksFromUUID("test-uuid");

      expect(result).toEqual(mockData);
    });

    // Add more tests for error cases
  });

  describe("regenerateVideo", () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
    });

    it("should use speaker voice gender when available", async () => {
      // Mock getSpeakerById for this test
      (speakerService.getSpeakerById as jest.Mock) = jest.fn().mockReturnValue({
        voice: {
          id: "voice1",
          name: "Test Voice",
          gender: "female",
          language: "en",
        },
      });

      const testTrack = {
        id: 1,
        start: 0,
        end: 1,
        speaker_id: "speaker1",
        path: "path/to/audio",
        text: "Hello",
        original_text: "Hello",
        for_dubbing: true,
        ssml_gender: "male", // This should be overridden by the voice gender
        translated_text: "Hola",
        original_translated_text: "Hola",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
        dubbed_path: "path/to/dubbed",
        chunk_size: 0,
        needsResynthesis: false,
        updated: true,
      };

      await DubbingAPIService.regenerateVideo("test-uuid", [testTrack]);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.utterance_update[0].gender).toBe("female");
    });

    it("should fallback to track ssml_gender when speaker voice is not available", async () => {
      // Mock getSpeakerById to return a speaker without voice
      (speakerService.getSpeakerById as jest.Mock) = jest.fn().mockReturnValue({
        voice: null,
      });

      const testTrack = {
        id: 1,
        start: 0,
        end: 1,
        speaker_id: "speaker1",
        path: "path/to/audio",
        text: "Hello",
        original_text: "Hello",
        for_dubbing: true,
        ssml_gender: "male",
        translated_text: "Hola",
        original_translated_text: "Hola",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
        dubbed_path: "path/to/dubbed",
        chunk_size: 0,
        needsResynthesis: false,
        updated: true,
      };

      await DubbingAPIService.regenerateVideo("test-uuid", [testTrack]);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.utterance_update[0].gender).toBe("male");
    });
  });
});
