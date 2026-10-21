/**
 * WEBAUDIO PROCEDURAL SOUND SYNTHESIS ENGINE
 * Generates realistic rocket propulsion, supersonic DACS O2 thruster hiss,
 * module snap clicks, and kinetic intercept explosions without external audio files.
 */
const AudioEngine = {
    ctx: null,
    muted: false,
    rocketGain: null,
    dacsGain: null,

    init: function () {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            const bufSize = this.ctx.sampleRate * 2;
            const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const ch = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) ch[i] = Math.random() * 2 - 1;

            const rocketSrc = this.ctx.createBufferSource();
            rocketSrc.buffer = noiseBuf;
            rocketSrc.loop = true;
            const lowFilter = this.ctx.createBiquadFilter();
            lowFilter.type = "lowpass";
            lowFilter.frequency.value = 340;
            this.rocketGain = this.ctx.createGain();
            this.rocketGain.gain.value = 0;
            rocketSrc.connect(lowFilter);
            lowFilter.connect(this.rocketGain);
            this.rocketGain.connect(this.ctx.destination);
            rocketSrc.start();

            const dacsSrc = this.ctx.createBufferSource();
            dacsSrc.buffer = noiseBuf;
            dacsSrc.loop = true;
            const bandFilter = this.ctx.createBiquadFilter();
            bandFilter.type = "bandpass";
            bandFilter.frequency.value = 1400;
            bandFilter.Q.value = 1.2;
            this.dacsGain = this.ctx.createGain();
            this.dacsGain.gain.value = 0;
            dacsSrc.connect(bandFilter);
            bandFilter.connect(this.dacsGain);
            this.dacsGain.connect(this.ctx.destination);
            dacsSrc.start();
        } catch (e) {
            console.warn("WebAudio skipped:", e);
        }
    },

    playSnapSound: function (pitchOffset) {
        this.init();
        if (!this.ctx || this.muted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(260 + (pitchOffset || 0) * 55, now);
            osc.frequency.exponentialRampToValueAtTime(680 + (pitchOffset || 0) * 80, now + 0.14);
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    },

    playExplosionSound: function () {
        this.init();
        if (!this.ctx || this.muted) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(22, now + 0.65);
            g.gain.setValueAtTime(0.32, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
        } catch (e) {}
    },

    updateFlightLoop: function (isFlying, isDacsFiring) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        if (this.muted) {
            if (this.rocketGain) this.rocketGain.gain.setTargetAtTime(0, now, 0.05);
            if (this.dacsGain) this.dacsGain.gain.setTargetAtTime(0, now, 0.05);
            return;
        }
        if (this.rocketGain) this.rocketGain.gain.setTargetAtTime(isFlying ? 0.24 : 0, now, 0.06);
        if (this.dacsGain) this.dacsGain.gain.setTargetAtTime(isDacsFiring ? 0.16 : 0, now, 0.03);
    }
};

window.AudioEngine = AudioEngine;
