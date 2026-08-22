(function () {
  const list = document.getElementById("catalogList");
  const search = document.getElementById("catalogSearch");
  const tags = document.getElementById("catalogTags");
  const count = document.getElementById("catalogCount");
  const empty = document.getElementById("catalogEmpty");
  if (!list) return;

  const items = Array.from(list.querySelectorAll("[data-catalog-item]"));
  let activeTag = "all";

  function norm(value) {
    return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function apply() {
    const q = norm(search ? search.value : "");
    let shown = 0;
    items.forEach((item) => {
      const hay = norm(item.getAttribute("data-search"));
      const itemTags = (item.getAttribute("data-tags") || "").split(/\s+/);
      const hitText = !q || hay.includes(q);
      const hitTag = activeTag === "all" || itemTags.includes(activeTag);
      const on = hitText && hitTag;
      item.hidden = !on;
      if (on) shown += 1;
    });
    if (count) count.textContent = shown + " / " + items.length;
    if (empty) empty.hidden = shown !== 0;
  }

  if (search) search.addEventListener("input", apply);
  if (tags) {
    tags.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-tag]");
      if (!btn) return;
      activeTag = btn.getAttribute("data-tag") || "all";
      tags.querySelectorAll("button[data-tag]").forEach((el) => {
        el.classList.toggle("is-on", el === btn);
      });
      apply();
    });
  }
  apply();
})();
