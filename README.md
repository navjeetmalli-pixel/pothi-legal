# Pothi legal

The Pothi app's privacy policy and terms, served over HTTPS at
<https://navjeetmalli-pixel.github.io/pothi-legal/privacy/> so the app stores always have a working URL,
independent of pothi.site's DNS.

**Do not edit the HTML here.** It is generated. The policy is authored in the
Pothi app, flows into the `pothi_website` repo through `tools/refresh_data.py`
and `tools/generate.py`, and is exported here by `tools/export_legal.py`, which
copies the policy text verbatim and checks it byte for byte. Editing this repo
by hand makes it disagree with the app and with pothi.site.

To update: change the policy in the app, then in `pothi_website` run

    python3 tools/refresh_data.py && python3 tools/generate.py && python3 tools/export_legal.py

then commit and push this repo.
