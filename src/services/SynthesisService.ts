import { Voice } from "../types/Voice";
import { MatxaSynthesisProvider } from "./MatxaSynthesisProvider";

export interface SynthesisProvider {
  speak(text: string, voice: Voice): Promise<AudioBuffer>;
  voices(): Promise<Voice[]>;
}

export class SynthesisService {
  private providers: Map<string, SynthesisProvider> = new Map();

  constructor() {
    // Register the Matxa provider

    this.registerProvider(
      MatxaSynthesisProvider.providerName,
      new MatxaSynthesisProvider()
    );
  }

  registerProvider(name: string, provider: SynthesisProvider) {
    this.providers.set(name, provider);
  }

  async speak(text: string, voice: Voice): Promise<AudioBuffer> {
    const provider = this.providers.get(voice.provider);
    if (!provider) {
      throw new Error(`Provider ${voice.provider} not found`);
    }
    return provider.speak(text, voice);
  }

  async voices(): Promise<Voice[]> {
    const allVoices: Voice[] = [];
    for (const [providerName, provider] of this.providers) {
      const providerVoices = await provider.voices();
      allVoices.push(...providerVoices);
    }
    return allVoices;
  }
}

// Create a single instance of the service
export const synthesisService = new SynthesisService();