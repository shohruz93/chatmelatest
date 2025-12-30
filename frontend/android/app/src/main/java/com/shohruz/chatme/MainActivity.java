package com.shohruz.chatme;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.voicerecorder.VoiceRecorder;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    registerPlugin(VoiceRecorder.class);
  }
}
