# Back2U campus validation — photo consent form (v1)

**Purpose.** Back2U is a student project that matches photos of lost items with photos of found items. We would like to photograph **one personal item of yours** (not you) to test how well the system works on real campus photos.

**What we will do**
- Take 4 photos of the item: 2 where you usually keep it and 2 somewhere on campus.
- Store the photos only on the project team's computers, in a folder that is never uploaded to GitHub or any public site.
- Use them only to measure the system's accuracy. They are not used to train models, are not put into the live Back2U app, and are not shared outside the project team.
- Publish only overall numbers (for example "Recall@1 = 0.80"), never the photos, unless you tick the box below.

**What we will avoid**
- Your face, your screen contents, and any name, ID number or address on the item. We check every photo and delete any that show these.
- Location data: GPS information is removed from the photo files.

**Your choices**
- Taking part is voluntary. You can withdraw at any time, without giving a reason, by telling the collector your pseudonym. We will delete your item's photos and re-run the evaluation without them.
- You are identified only by a pseudonym (for example `owner_07`).

| | |
|---|---|
| Pseudonym | `owner_____` |
| Item (category, short description) | |
| ☐ I agree to my item being photographed and used as described above. | |
| ☐ (optional) Photos of my item may appear in the project report. | |
| Date | |
| Signature | |
| Collector pseudonym | |

*Keep the signed paper form offline. Record only `consent.granted`, `form_version: "v1"`, `owner_pseudonym` and `allows_publication_of_photos` in `instance.json`.*
