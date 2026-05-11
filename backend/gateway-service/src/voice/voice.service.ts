import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class VoiceService {
  constructor(private config: ConfigService) {}

  private get voiceUrl() {
    let url = this.config.get('VOICE_SERVICE_URL') || 'http://clinova-voice:8003';
    if (url && !url.startsWith('http')) {
      url = `http://${url}`;
    }
    return url;
  }

  async proxy(path: string, body: any) {
    const res = await axios.post(`${this.voiceUrl}/api/voice/${path}`, body, { timeout: 30000 });
    return res.data;
  }

  async deleteRoom(roomName: string) {
    const res = await axios.delete(`${this.voiceUrl}/api/voice/rooms/${roomName}`);
    return res.data;
  }
}
