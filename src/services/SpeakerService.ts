import { v4 as uuidv4 } from "uuid";
import { Voice } from "../types/Voice";
import { matxaSynthesisProvider } from "./MatxaSynthesisProvider";

export interface Speaker {
  id: string;
  name: string;
  voice: Voice;
  color: string;
}

const getRandomColor = () => {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
};

class SpeakerService {
  private speakers: Speaker[] = [];

  async setSpeakers(speakersData: Partial<Speaker>[]): Promise<void> {
    this.speakers = await Promise.all(
      speakersData.map(async (speaker) => ({
        id: speaker.id || uuidv4(),
        name: speaker.name || "",
        voice: speaker.voice || (await matxaSynthesisProvider.getVoice("0")),
        color: speaker.color || getRandomColor(),
      }))
    );
    this.sortSpeakers();
  }

  async setSpeaker(speaker: Partial<Speaker> & { id: string }): Promise<void> {
    if (this.speakers.find((s) => s.id === speaker.id)) {
      this.updateSpeaker(speaker.id, speaker);
    } else {
      this.speakers.push({
        id: speaker.id,
        name: speaker.name || "",
        voice: speaker.voice || (await matxaSynthesisProvider.getVoice("0")),
        color: speaker.color || getRandomColor(),
      });
    }
  }

  getSpeakers(): Speaker[] {
    return this.speakers;
  }

  addSpeaker(
    name: string,
    voice: Voice,
    color: string = getRandomColor()
  ): void {
    this.speakers.push({
      id: uuidv4(),
      name,
      voice,
      color,
    });
  }

  updateSpeaker(id: string, updates: Partial<Speaker>): void {
    const index = this.speakers.findIndex((speaker) => speaker.id === id);
    if (index !== -1) {
      this.speakers[index] = { ...this.speakers[index], ...updates };
    }
  }

  getSpeakerById(id: string): Speaker {
    return (
      this.speakers.find((speaker) => speaker.id === id) || this.speakers[0]
    );
  }

  sortSpeakers(): void {
    this.speakers.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const speakerService = new SpeakerService();
