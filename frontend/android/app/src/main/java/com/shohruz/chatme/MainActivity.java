package com.shohruz.chatme;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.independo.capacitor.voicerecorder.VoiceRecorder;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    registerPlugin(VoiceRecorder.class);
  }
}
