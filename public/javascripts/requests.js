$(function () {
    $('[data-toggle="popover"]').popover();
    $('.furniture-children-row').on('show.bs.collapse', showFurnitureChildren);
    $('.furniture-children-row').on('hide.bs.collapse', hideFurnitureChildren);
});


function showFurnitureChildren(e){
    const $parentRow = $(this).closest('.furniture-row');

    const $parentInput = $parentRow.find('.furniture-item-quantity').first();
    const parentVal =$parentInput.val();
    $parentInput.val(null);

    $parentRow.find('.furniture-item-quantity').first().hide();

    const $childInput =  $parentRow.find('.furniture-children-row').find('.furniture-row').first().find('.furniture-item-quantity').first();
    $childInput.val(parentVal);
}

function hideFurnitureChildren(e){
    const $parentRow = $(this).closest('.furniture-row');

    let childVal = 0;
    $parentRow.find('.furniture-children-row').find('.furniture-row').each(function() {
        $childInput = $(this).find('.furniture-item-quantity');
        if ($childInput.val()){
            childVal += Number($childInput.val());
        }
        $childInput.val(null);
    });

    const $parentInput = $parentRow.find('.furniture-item-quantity').first();
    $parentInput.val(childVal);

    $parentRow.find('.furniture-item-quantity').first().show();

}
