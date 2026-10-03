import * as profileApi from "./profile";
import * as profileMock from "../mocks/profile";

const profile =
  import.meta.env.VITE_MOCK_PROFILE === "true" ? profileMock : profileApi;

export { profile };