package com.bongohorse.monstergirldelivery;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "EvidenceExport")
public class EvidenceExportPlugin extends Plugin {
    private static final Pattern SAFE_FILENAME = Pattern.compile("[A-Za-z0-9._-]{1,180}");
    private static final int MAX_CONTENT_BYTES = 2 * 1024 * 1024;

    @PluginMethod
    public void share(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content");

        if (filename == null || !SAFE_FILENAME.matcher(filename).matches()) {
            call.reject("Evidence filename is invalid.");
            return;
        }
        if (content == null) {
            call.reject("Evidence content is required.");
            return;
        }

        byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
        if (contentBytes.length > MAX_CONTENT_BYTES) {
            call.reject("Evidence payload exceeds the 2 MiB safety limit.");
            return;
        }

        try {
            File evidenceDirectory = new File(getContext().getCacheDir(), "mgd-evidence");
            if (!evidenceDirectory.exists() && !evidenceDirectory.mkdirs()) {
                call.reject("Could not create the evidence export directory.");
                return;
            }

            File evidenceFile = new File(evidenceDirectory, filename);
            try (FileOutputStream stream = new FileOutputStream(evidenceFile, false)) {
                stream.write(contentBytes);
            }

            Uri evidenceUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                evidenceFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND)
                .setType("application/json")
                .putExtra(Intent.EXTRA_STREAM, evidenceUri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            shareIntent.setClipData(ClipData.newRawUri("MGD performance evidence", evidenceUri));

            Intent chooser = Intent.createChooser(shareIntent, "Share MGD performance evidence");
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("shared", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not share performance evidence: " + error.getMessage(), error);
        }
    }
}
