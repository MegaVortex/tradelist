let editor = null;
let currentlyEditing = {
  slug: null,
  type: null,
};

const JSON_SAVE_API = "http://127.0.0.1:3042";

function openJsonEditor(dataOrSlug, showType) {
  let showData;

  if (typeof dataOrSlug === "object") {
    showData = dataOrSlug;
  } else {
    showData = window.allShowsData?.find(
      (show) => show.fileSlug === dataOrSlug
    );
  }

  if (!showData) {
    alert("Error: Could not find show data.");
    return;
  }

  currentlyEditing = { slug: showData.fileSlug, type: showType };

  try {
    const container = document.getElementById("json-editor");
    document.getElementById("json-modal").style.display = "block";
    editor = new JSONEditor(container, { mode: "tree" });
    editor.set(showData);
    editor.expandAll();
  } catch (err) {
    alert("An unexpected error occurred with the JSON editor: " + err.message);
  }
}

function closeJsonEditor() {
  document.getElementById("json-modal").style.display = "none";
  if (editor) {
    editor.destroy();
  }
  currentlyEditing = { slug: null, type: null };
}

async function saveJson() {
  try {
    const updatedData = editor.get();
    const sessionResponse = await fetch(`${JSON_SAVE_API}/api/session`, {
      cache: "no-store",
    });

    if (!sessionResponse.ok) {
      throw new Error("Could not establish a local save session");
    }

    const { token } = await sessionResponse.json();
    const saveResponse = await fetch(`${JSON_SAVE_API}/api/save-json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TL-Dev-Token": token,
      },
      body: JSON.stringify({
        slug: currentlyEditing.slug,
        data: updatedData,
        type: currentlyEditing.type,
      }),
    });
    const result = await saveResponse.json();

    if (!saveResponse.ok || !result.success) {
      throw new Error(result.error || "Unknown error");
    }

    alert("JSON saved successfully.");
    closeJsonEditor();
  } catch (err) {
    alert("Error saving JSON: " + err.message);
  }
}
