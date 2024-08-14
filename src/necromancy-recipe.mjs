const { loadModule, version } = mod.getContext(import.meta);
class NecromancyRecipeOptionElement extends ItemRecipeOptionElement {
    setUnlocked(recipe) {
        super.setUnlocked(recipe);
        this.unlocked.onclick = ()=>game.necromancy.selectRecipeOnClick(recipe);
        recipe.alternativeCosts !== undefined ? showElement(this.multipleRecipes) : hideElement(this.multipleRecipes);
    }
    getRecipeIngredients(recipe) {
        return game.necromancy.getRecipeCosts(recipe);
    }
}
window.customElements.define('necromancy-recipe-option', NecromancyRecipeOptionElement);

export class NecromancyRecipe extends SingleProductArtisanSkillRecipe {
    constructor(namespace, data, skill, game) {
        super(namespace, data, game, skill);
        if(data.baseInterval !== undefined)
            this.baseInterval = data.baseInterval;
        if(data.alternativeCosts !== undefined) {
            this.alternativeCosts = data.alternativeCosts.map(({itemCosts, quantityMultiplier})=>{
                return {
                    itemCosts: game.items.getQuantities(itemCosts),
                    quantityMultiplier,
                };
            });
        }
    }
}