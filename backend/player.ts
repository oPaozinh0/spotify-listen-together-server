import ClientInfo from "./clientInfo"
import config from '../config'
import SocketServer from "./socket"
import SongInfo from "./web-shared/songInfo"

export type ContextTrack = {
  uri: string;
  uid?: string | null;
  metadata?: any;
}

export default class Player {
  public trackUri = ""
  public paused = true
  public loadingTrack: NodeJS.Timeout | null = null
  public milliseconds = 0
  public locked = false
  public millisecondsLastUpdate = Date.now()
  public songInfo = new SongInfo()
  public loadAtMilliseconds = 0;
  public queue: ContextTrack[] = [];
  
  constructor(public socketServer: SocketServer) { }

  static isTrackListenable(trackUri: string) {
    return trackUri.startsWith("spotify:track:") || trackUri.startsWith("spotify:episode:")
  }

  static isTrackAd(trackUri: string) {
    return trackUri.startsWith("spotify:ad:")
  }

  // Returns elapsed duration in milliseconds
  getTrackProgress() {
    return this.paused ? this.milliseconds : this.milliseconds+(Date.now()-this.millisecondsLastUpdate)
  }

  /*
    Commands
  */
  updateSong(pause: boolean, milliseconds: number) {
    console.log(`function call: updateSong(pause:${pause}, milliseconds:${milliseconds})`)
    if (this.loadingTrack === null && Player.isTrackListenable(this.trackUri)) {
      this.paused = pause
      this.milliseconds = milliseconds
      this.millisecondsLastUpdate = Date.now()
      this.socketServer.emitToListeners("updateSong", this.paused, milliseconds)
      this.updateSongInfo()
      this.loadAtMilliseconds = 0;
      return true
    }
    return false
  }

  changeSong(trackUri: string) {
    console.log(`function call: changeSong(trackUri:${trackUri})`)
    if (Player.isTrackListenable(trackUri)) {
      if (this.loadingTrack !== null)
        clearTimeout(this.loadingTrack)
      
      this.milliseconds = 0
      this.trackUri = trackUri
      this.socketServer.emitToListeners("changeSong", trackUri)
      this.loadingTrack = setTimeout(() => {
        console.log("Timed out for loading track!")
        this.trackLoaded()
      }, config.maxDelay)
    }
  }

  getQueue() {
    return this.queue;
  }

  addToQueue(tracks: ContextTrack[]) {
    console.log(`function call: addToQueue(tracks:${tracks})`)
    this.queue.push(...tracks);
    this.socketServer.emitToListeners('addToQueue', [...tracks]);
  }

  removeFromQueue(tracks: ContextTrack[]) {
    console.log(`function call: removeFromQueue(tracks:${tracks})`)
    const removedTracks: ContextTrack[] = [];

    for (const trackToRemove of tracks) {
      const index = this.queue.findIndex(track => track.uri === trackToRemove.uri);
      if (index !== -1) {
        removedTracks.push(this.queue.splice(index, 1)[0]);
      }
    }

    this.socketServer.emitToListeners('removeFromQueue', removedTracks);
  }
  
  clearQueue() {
    console.log(`function call: clearQueue()`)
    this.queue = [];
    this.socketServer.emitToListeners('clearQueue');
  }

  /*
    Requests
  */
  requestUpdateSong(info: ClientInfo | undefined, pause: boolean, milliseconds: number) {
    console.log(`function call: requestUpdateSong(info: ${info}, pause: ${pause}, milliseconds: ${milliseconds})`)
    if (info === undefined || info?.isHost) {
      if (this.locked) {
        info?.socket.emit("bottomMessage", "Listen together is currently locked!", true)
      } else {
        this.updateSong(pause, milliseconds)
      }
    }
  }

  /*
    Updates
  */
  listenerLoadingSong(info: ClientInfo, newTrackUri: string) {
    console.log(`function call: listenerLoadingSong(info: ${info}, newTrackUri: ${newTrackUri})`)
    if (info.isHost && newTrackUri !== this.trackUri) {
      if (this.locked) {
        info.socket.emit("bottomMessage", "Listen together is currently locked!", true)
      } else {
        this.changeSong(newTrackUri)
      }
    }
  }

  listenerChangedSong(info: ClientInfo, newTrackUri: string, songName?: string, songImage?: string) {
    console.log(`function call: listenerChangedSong(info: ${info}, newTrackUri: ${newTrackUri})`)
    if (newTrackUri === "") {
      return;
    }
    info.trackUri = newTrackUri
    if (info.isHost) {
      this.updateSongInfo(songName, songImage)
    }
    this.checkListenerHasAD()
    if (!this.locked) {
      if (this.loadingTrack !== null) {
        this.checkTrackLoaded()
      } else {
        this.checkDesynchronizedListeners()
      }
    }
  }

  listenerLoggedIn(info: ClientInfo) {
    console.log(`function call: listenerLoggedIn(info: ${info})`)
    this.checkListenerHasAD()
    if (!this.locked) {
      this.checkDesynchronizedListeners()
    }
  }

  listenerLoggedOut() {
    console.log(`function call: listenerLoggedOut()`)
    this.checkListenerHasAD()
  }

  /*
    Checks
  */
  checkTrackLoaded() {
    if (this.socketServer.getListeners().every((info) => info.trackUri === this.trackUri)) {
      console.log(this.loadAtMilliseconds)
      this.trackLoaded()
    }
  }

  checkListenerHasAD() {
    let hasAD = this.socketServer.getListeners().some((info) => Player.isTrackAd(info.trackUri))
    this.lock(hasAD)
  }

  checkDesynchronizedListeners() {
    if (this.loadingTrack === null) {
      if (this.socketServer.getListeners().some((info) => info.trackUri !== this.trackUri)) {
        console.trace()
        this.loadAtMilliseconds = this.getTrackProgress()
        this.changeSong(this.trackUri)
      }
    }
  }

  ///////////

  trackLoaded() {
    if (this.loadingTrack)
      clearTimeout(this.loadingTrack)
    this.loadingTrack = null

    let milliseconds = this.loadAtMilliseconds
    this.loadAtMilliseconds = 0
    setTimeout(() => {
      console.log(`====== ${milliseconds}  ${this.trackUri}`)
      this.requestUpdateSong(undefined, false, milliseconds)
    }, 1000)
  }

  lock(lock: boolean) {
    console.log("LOCKING: " + lock)
    if (this.locked != lock) {
      this.locked = lock
      if (this.locked) {
        // this.updateSong(true, 0)
      } else {
        this.changeSong(this.socketServer.getHost()?.trackUri || this.trackUri)
      }
      this.socketServer.sendListeners()
    }
  }
  
  onRequestSongInfo(info: ClientInfo) {
    console.log(`function call: onRequestSongInfo(info: ${info})`)
    info.socket.emit("songInfo", this.songInfo)
  }

  onRequestQueue(info: ClientInfo) {
    console.log(`function call: onRequestQueue(info: ${info})`)
    info.socket.emit('requestQueue', this.queue);
  }

  onNoListeners() {
    this.trackUri = ""
    this.paused = true
    this.milliseconds = 0
    this.updateSongInfo("", "")
  }
  
  updateSongInfo(newName?: string, newImage?: string) {
    console.log(`function call: updateSongInfo()`)
    if (newName != undefined)
      this.songInfo.name = newName

    if (newImage != undefined)
      if ((newImage.match(/:/g) || []).length === 2)
        this.songInfo.image = "https://i.scdn.co/image/" + newImage.split(":")[2]
      else
        this.songInfo.image = ""

    this.songInfo.paused = this.paused
    this.socketServer.emitToNonListeners("songInfo", this.songInfo)
  }
}
