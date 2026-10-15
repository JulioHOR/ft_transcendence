import type { Room } from "@colyseus/sdk";

let voiceSource: MediaStream | null = null;
let roomSignal: Room | null = null;

const otherPeersConnections = new Map<string, RTCPeerConnection>();

export function initVoice(room: Room) {
  roomSignal = room;
}

export function getOrCreatePeer(peerId: string): RTCPeerConnection {
  let peerConnection: RTCPeerConnection | undefined =
    otherPeersConnections.get(peerId);

  if (peerConnection !== undefined) {
    return peerConnection;
  }

  peerConnection = new RTCPeerConnection();

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

export async function callPeer(peerId: string): Promise<void> {

  

}

export async function startMic(): Promise<void> {
  if (voiceSource !== null) {
    return;
  }

  voiceSource = await navigator.mediaDevices.getUserMedia({ audio: true });
}
