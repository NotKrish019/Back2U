import os
path = "src/components/threeui/src/shaders/neuform-isolated/sources/creator-studio-intro.html"
with open(path) as f:
    html = f.read()

out_path = path.replace(".html", ".ts")
with open(out_path, "w") as f:
    f.write("export default `\n")
    # escape backticks and ${}
    escaped = html.replace("`", "\\`").replace("${", "\\${")
    f.write(escaped)
    f.write("\n`;\n")

print(f"Created {out_path}")
