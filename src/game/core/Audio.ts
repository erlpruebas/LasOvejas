export class Sfx {
  private ctx: AudioContext | null = null;
  private get audio() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx!;
  }

  whistle() {
    const a = this.audio;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1200, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(2300, a.currentTime + 0.18);
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.12, a.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.22);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.24);
  }

  bleat() { // balido corto
    const a = this.audio;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, a.currentTime + 0.16);
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.09, a.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.22);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.24);
  }
}



