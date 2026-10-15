import type { Room } from "@colyseus/sdk";

let voiceSource: MediaStream | null = null;
let roomSignal: Room | null = null;

const otherPeersConnections = new Map<string, RTCPeerConnection>();
const peerAudios = new Map<string, HTMLAudioElement>();

type SignalData =
  | RTCSessionDescriptionInit
  | { type: "candidate"; candidate: RTCIceCandidateInit };

async function handleSignal(peerId: string, data: SignalData): Promise<void> {
  if (roomSignal === null) {
    return;
  }

  if (data.type === "offer") {
    const peerConnection: RTCPeerConnection = getOrCreatePeer(peerId);

    await peerConnection.setRemoteDescription(data);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    roomSignal.send("signal", {
      to: peerId,
      data: { type: answer.type, sdp: answer.sdp },
    });
  }

  if (data.type === "answer") {
    const peerConnection: RTCPeerConnection = getOrCreatePeer(peerId);
    await peerConnection.setRemoteDescription(data);
  }

  if (data.type === "candidate") {
    await getOrCreatePeer(peerId).addIceCandidate(data.candidate);
  }
}

export function initVoice(room: Room) {
  roomSignal = room;

  room.onMessage("signal", (message) => {
    handleSignal(message.from, message.data).catch((err) => console.error(err));
  });
}

export function getOrCreatePeer(peerId: string): RTCPeerConnection {
  let peerConnection: RTCPeerConnection | undefined =
    otherPeersConnections.get(peerId);

  if (peerConnection !== undefined) {
    return peerConnection;
  }

  peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    if (event.candidate === null || roomSignal == null) {
      return;
    }

    roomSignal.send("signal", {
      to: peerId,
      data: { type: "candidate", candidate: event.candidate.toJSON() },
    });
  };

  peerConnection.ontrack = (event) => {
    const audio: HTMLAudioElement = new Audio();

    audio.srcObject = event.streams[0];
    audio.play().catch((err) => console.error(err));
    peerAudios.set(peerId, audio);
  };

  if (voiceSource !== null) {
    for (const track of voiceSource.getTracks()) {
      peerConnection.addTrack(track, voiceSource);
    }
  } else {
    peerConnection.addTransceiver("audio", { direction: "recvonly" });
  }

  otherPeersConnections.set(peerId, peerConnection);
  return peerConnection;
}

export function removePeer(peerId: string): void {
  // Won't run '.close()' if it doesn't exist — That's what the question mark does
  otherPeersConnections.get(peerId)?.close();
  otherPeersConnections.delete(peerId);

  const audio: HTMLAudioElement | undefined = peerAudios.get(peerId);

  if (audio === undefined) {
    return;
  }

  audio.pause();
  audio.srcObject = null;
  peerAudios.delete(peerId);
}

export async function callPeer(peerId: string): Promise<void> {
  if (roomSignal === null || roomSignal.sessionId > peerId) {
    return;
  }

  const peerConnection: RTCPeerConnection = getOrCreatePeer(peerId);
  const connectionOffer: RTCSessionDescriptionInit =
    await peerConnection.createOffer();
  await peerConnection.setLocalDescription(connectionOffer);
  roomSignal.send("signal", {
    to: peerId,
    data: { type: connectionOffer.type, sdp: connectionOffer.sdp },
  });
}

export async function startMic(): Promise<void> {
  if (voiceSource !== null) {
    return;
  }

  voiceSource = await navigator.mediaDevices.getUserMedia({ audio: true });
}
