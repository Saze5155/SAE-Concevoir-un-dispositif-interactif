<template>
  <div class="search-container">
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Rechercher un nom..."
      class="search-bar"
      @input="handleSearch"
    />
    <div v-if="searchResults.length > 0" class="search-results">
      <div
        v-for="result in searchResults"
        :key="result.id"
        class="search-result-item"
        @click="zoomToNode(result)"
      >
        {{ result.name }} ({{ result.type === "acteur" ? "Acteur" : "Film" }})
      </div>
    </div>
  </div>
  <div ref="graphContainer" class="graph"></div>
</template>

<script setup>
import * as d3 from "d3";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  data: Object,
});
const router = useRouter();
const graphContainer = ref(null);
const searchQuery = ref("");
const searchResults = ref([]);
let simulation, nodeSelection, nodeData, svg, g;

function handleSearch() {
  if (!searchQuery.value || !nodeData) {
    searchResults.value = [];
    return;
  }

  const query = searchQuery.value.toLowerCase();
  searchResults.value = nodeData
    .filter((d) => d.name.toLowerCase().includes(query))
    .slice(0, 5); // Limite à 5 résultats pour éviter de surcharger l'interface
}

function zoomToNode(node) {
  if (!node || !svg || !g) return;

  // Centrer la vue sur le nœud sélectionné avec un zoom
  const currentTransform = d3.zoomTransform(svg.node());
  const scale = 1.5;
  const x = node.x;
  const y = node.y;

  // Calcul des coordonnées pour centrer le nœud
  const width = graphContainer.value.clientWidth;
  const height = graphContainer.value.clientHeight;
  const tx = width / 2 - scale * x;
  const ty = height / 2 - scale * y;

  // Application de la transformation avec une transition
  svg
    .transition()
    .duration(750)
    .call(d3.zoom().transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

  // Mettre en évidence le nœud trouvé
  nodeSelection
    .attr("r", (d) => (d.id === node.id ? 12 : 8))
    .attr("stroke-width", (d) => (d.id === node.id ? 3 : 1.5));

  // Effacer les résultats de recherche après sélection
  searchResults.value = [];
  searchQuery.value = node.name;
}

onMounted(() => renderGraph());
watch(
  () => props.data,
  () => renderGraph()
);

function renderGraph() {
  const { nodes, links } = props.data || {};
  if (!nodes || !links) return;
  nodeData = JSON.parse(JSON.stringify(nodes)); // Copie profonde pour éviter des problèmes de référence

  const width = graphContainer.value.clientWidth || 500;
  const height = 500;
  d3.select(graphContainer.value).selectAll("*").remove();

  svg = d3
    .select(graphContainer.value)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height);

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  g = svg.append("g");

  // Initialisation de la simulation
  simulation = d3
    .forceSimulation(nodeData)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(100)
    )
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.1))
    .force("y", d3.forceY(height / 2).strength(0.1));

  // Création des liens
  const link = g
    .append("g")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line");

  // Création des nœuds
  nodeSelection = g
    .append("g")
    .selectAll("circle")
    .data(nodeData)
    .join("circle")
    .attr("r", 8)
    .attr("fill", (d) => (d.type === "acteur" ? "red" : "gold"))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // Création du tooltip
  const tooltip = d3
    .select(graphContainer.value)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "#333")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Gestion des événements sur les nœuds
  nodeSelection
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(d.name)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      if (d.type === "acteur") {
        router.push(`/acteur/${d.id}`);
      } else if (d.type === "film") {
        router.push(`/film/${d.id}`);
      }
    });

  // Mise à jour des positions à chaque tick de la simulation
  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeSelection.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}
</script>

<style scoped>
.graph {
  margin-top: 1rem;
  border: 1px solid #ccc;
  position: relative;
  height: 500px;
}

.tooltip {
  font-size: 0.85rem;
  z-index: 10;
}

.search-container {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

.search-bar {
  padding: 0.5rem 1rem;
  width: 300px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.search-results {
  position: absolute;
  top: 100%;
  width: 300px;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ccc;
  border-radius: 0 0 8px 8px;
  z-index: 100;
}

.search-result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}
</style>
