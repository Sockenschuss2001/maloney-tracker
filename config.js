window.MALONEY_CONFIG = {
  sourcePriority: ['srf', 'private', 'youtube'],
  privateAudioManifest: './private-audio.json',
  youtubeManifest: './youtube.json',
  youtubePrivacyEnhanced: true,

  // Bereits getestetes Vercel-Gateway
  privateAudioGateway: 'https://maloney-audio-gateway.vercel.app',

  // Das Passwort wird nur für die aktuelle Browser-/PWA-Sitzung gehalten.
  privatePasswordStorageKey: 'maloneyPrivateAudioPassword.v1'
};
