// Message names shared by the client and the server. A name typed on one side and misspelled on the other is never handled, and nothing reports it. These prevents that from silently breaking the messages.
export const MSG_UPDATE_POSITION = "updatePosition";
export const MSG_SET_EQUIPPED = "setEquipped";
export const MSG_SIGNAL = "signal";