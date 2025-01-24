import { MatxaSynthesisProvider, MatxaVoice } from "./MatxaSynthesisProvider";

describe("MatxaSynthesisProvider", () => {
  let provider: MatxaSynthesisProvider;
  const mockApiVoices = [
    {
      name: "test-central",
      id: "99",
      gender: "male",
      language: "cat",
      region: "central",
    },
  ];

  beforeEach(() => {
    // Reset fetch mock before each test
    jest.resetAllMocks();
    // Create a new instance for each test
    provider = new MatxaSynthesisProvider();
  });

  describe("voices()", () => {
    it("should fetch and return voices from API", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiVoices),
      });

      const voices = await provider.voices();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/voices/")
      );
      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        ...mockApiVoices[0],
        provider: "matxa",
        label: "Home - Central (Test)",
      });
    });

    it("should return default voices when API fails", async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error("API Error"));

      const voices = await provider.voices();

      expect(voices).toHaveLength(8); // Default voice list length
      expect(voices[0].name).toBe("quim-balear");
    });
  });

  describe("speak()", () => {
    const mockVoice: MatxaVoice = {
      id: "1",
      provider: "matxa",
      language: "cat",
      region: "central",
      name: "test-central",
      gender: "male",
      label: "Home - Central (Test)",
    };

    const mockText = "Hello world";

    it("should call API with correct parameters and return ArrayBuffer", async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      const result = await provider.speak(mockText, mockVoice);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/speak/?text=${encodeURIComponent(mockText)}&voice=${mockVoice.id}`
        )
      );
      expect(result).toBe(mockArrayBuffer);
    });

    it("should throw error when API call fails", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(provider.speak(mockText, mockVoice)).rejects.toThrow(
        "HTTP error! status: 500"
      );
    });

    it("should throw error when network fails", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error"));

      await expect(provider.speak(mockText, mockVoice)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getVoice()", () => {
    const mockApiVoices = [
      {
        name: "test-central",
        id: "99",
        gender: "male",
        language: "cat",
        region: "central",
      },
    ];

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiVoices),
      });
    });

    it("should return voice by id", async () => {
      const voice = await provider.getVoice("1");
      expect(voice.name).toBe("test-central");
    });

    it("should return first voice when id not found", async () => {
      const voice = await provider.getVoice("non-existent");
      expect(voice.name).toBe("test-central");
    });
  });

  describe("getProviderName()", () => {
    it("should return correct provider name", () => {
      expect(provider.getProviderName()).toBe("matxa");
    });
  });
});
