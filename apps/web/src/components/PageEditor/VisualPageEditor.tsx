import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { RiAddLine, RiArrowLeftLine, RiSave3Line } from "@remixicon/react";

import { fetchBlockData } from "@/actions/page";
import type { BlockConfig } from "@/blocks/types";
import HorizontalScroll from "@/components/HorizontalScroll";
import BlockConfigPanel from "@/components/PageEditor/BlockConfigPanel";
import BlockLibrary from "@/components/PageEditor/BlockLibrary";
import VisualBlockRenderer, {
  SingleBlockRenderer,
} from "@/components/PageEditor/VisualBlockRenderer";
import runWithAuth from "@/lib/client/run-with-auth";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Drawer } from "@/ui/Drawer";
import { useToast } from "@/ui/Toast";

interface VisualPageEditorProps {
  initialBlocks: BlockConfig[];
  onSave: (blocks: BlockConfig[]) => Promise<void>;
  onBack: () => void;
  pageTitle: string;
}

export default function VisualPageEditor({
  initialBlocks,
  onSave,
  onBack,
  pageTitle,
}: VisualPageEditorProps) {
  const [blocks, setBlocks] = useState<BlockConfig[]>(initialBlocks);
  const [activeBlockId, setActiveBlockId] = useState<string | number | null>(
    null,
  );
  // 跟踪应该隐藏动画的 block IDs（编辑内容后隐藏，关闭面板后重置）
  const [hideAnimationBlockIds, setHideAnimationBlockIds] = useState<
    Set<string | number>
  >(new Set());
  const [activeDragId, setActiveDragId] = useState<string | number | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial blocks if they change (e.g. from server)
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags when clicking
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((item) => item.id === active.id);
      const newIndex = blocks.findIndex((item) => item.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
    // Delay clearing activeDragId to allow drop animation to finish
    // This prevents the "flicker" where the item reappears before the overlay lands
    setTimeout(() => {
      setActiveDragId(null);
    }, 250);
  };

  const handleSelectBlock = (id: string | number) => {
    setActiveBlockId(id);
    setIsDrawerOpen(true);
  };

  const handleUpdateBlock = (updates: Partial<BlockConfig>) => {
    if (!activeBlockId) return;
    // 标记该 block 应该隐藏动画
    setHideAnimationBlockIds((prev) => new Set(prev).add(activeBlockId));
    setBlocks(
      blocks.map((item) =>
        item.id === activeBlockId
          ? ({ ...item, ...updates } as BlockConfig)
          : item,
      ),
    );
  };

  // 刷新当前 Block 的数据
  const handleRefreshBlockData = async () => {
    if (!activeBlockId) return;

    const activeBlock = blocks.find((b) => b.id === activeBlockId);
    if (!activeBlock) return;

    try {
      const result = await runWithAuth(fetchBlockData, {
        access_token: undefined,
        block: activeBlock,
      } as never);

      if (result && "data" in result && result.data) {
        handleUpdateBlock({ data: result.data.data });
        toast.success("数据已更新");
      } else {
        toast.error("更新失败");
      }
    } catch (error) {
      console.error("刷新 Block 数据失败:", error);
      toast.error("更新出错");
    }
  };

  // 删除当前 Block
  const handleDeleteBlock = () => {
    if (!activeBlockId) return;
    setBlocks(blocks.filter((b) => b.id !== activeBlockId));
    setIsDrawerOpen(false);
    setActiveBlockId(null);
  };

  const handleAddBlock = async (type: string) => {
    setIsAddingBlock(true);
    try {
      const newId = Date.now();
      const newBlock: BlockConfig = {
        id: newId,
        block: type,
        description: `New ${type} block`,
        content: {},
      } as BlockConfig;

      // 调用 Server Action 获取数据
      const result = await runWithAuth(fetchBlockData, {
        access_token: undefined, // 使用 cookie 中的 token
        block: newBlock,
      } as never);

      if (result && "data" in result && result.data) {
        newBlock.data = result.data.data;
      }

      setBlocks([...blocks, newBlock]);
      setIsLibraryOpen(false);

      // 关闭对话框后，等待渲染完成，然后滚动到最后并选中新 block
      setTimeout(() => {
        const el = document.getElementById("editor-scroll-container");
        if (el) {
          // 使用平滑滚动到最右边
          el.scrollTo({
            left: el.scrollWidth,
            behavior: "smooth",
          });
        }
        // 再延迟一点确保滚动完成后选中
        setTimeout(() => {
          handleSelectBlock(newId);
        }, 300);
      }, 100);
    } catch (error) {
      console.error("添加 Block 失败:", error);
    } finally {
      setIsAddingBlock(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(blocks);
    } finally {
      setIsSaving(false);
    }
  };

  // 关闭编辑面板，重置 block 的动画隐藏状态
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // 重置当前 block 的状态，以便下次打开时仍显示高亮动画
    if (activeBlockId) {
      setHideAnimationBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(activeBlockId);
        return next;
      });
    }
    setActiveBlockId(null);
  };

  const activeBlock = blocks.find((b) => b.id === activeBlockId) || null;
  const draggingBlock = blocks.find((b) => b.id === activeDragId);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-border mb-2 flex items-center justify-between px-4 bg-background z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon={<RiArrowLeftLine size={18} />}
            label="返回"
          />
          <div className="h-6 w-px bg-border" />
          <h1>布局编辑器</h1>
          <div className="h-6 w-px bg-border" />
          <div className="">{pageTitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RiAddLine size="1.25em" />}
            label="添加区块"
            onClick={() => setIsLibraryOpen(true)}
            disabled={isAddingBlock}
          />
          <Button
            variant="primary"
            size="sm"
            icon={<RiSave3Line size="1.25em" />}
            label="保存更改"
            loading={isSaving || isAddingBlock}
            onClick={handleSave}
          />
        </div>
      </div>

      {/* Main Canvas */}
      <div
        ref={containerRef}
        className="flex-1 bg-muted/10 overflow-hidden relative"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          autoScroll={{
            threshold: {
              x: 0.1, // 10% from edge triggers scroll
              y: 0,
            },
            acceleration: 5, // smoothness
          }}
        >
          <div className="h-full">
            <HorizontalScroll
              className="h-full"
              forceNativeScroll={true} // Enable native scroll for DnD compatibility
            >
              <div
                id="editor-scroll-container"
                className="h-full flex flex-nowrap px-10 gap-4 items-center"
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <VisualBlockRenderer
                    blocks={blocks}
                    activeBlockId={activeBlockId}
                    onSelectBlock={handleSelectBlock}
                    hideAnimationBlockIds={hideAnimationBlockIds}
                  />
                </SortableContext>

                {/* Empty State / Add Placeholder */}
                {blocks.length === 0 && (
                  <div className="h-[80%] w-[300px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                    <p>页面为空</p>
                    <Button
                      variant="ghost"
                      label="添加第一个区块"
                      onClick={() => setIsLibraryOpen(true)}
                      className="mt-4"
                    />
                  </div>
                )}
              </div>
            </HorizontalScroll>
          </div>

          {mounted &&
            createPortal(
              <DragOverlay style={{ pointerEvents: "none" }}>
                {draggingBlock ? (
                  <div className="h-full border-2 border-primary shadow-2xl opacity-90 bg-background">
                    <SingleBlockRenderer block={draggingBlock} />
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )}
        </DndContext>
      </div>

      {/* Config Drawer */}
      <Drawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialSize={0.4}
        className="z-50"
        showBackdrop={false}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto py-4 pb-20">
            <BlockConfigPanel
              block={activeBlock}
              onUpdate={handleUpdateBlock}
              onRefreshData={handleRefreshBlockData}
              onDelete={handleDeleteBlock}
            />
          </div>
        </div>
      </Drawer>

      {/* Library Dialog */}
      <Dialog
        open={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        title="添加区块"
        size="xl"
      >
        <div>
          <BlockLibrary onAdd={handleAddBlock} isLoading={isAddingBlock} />
        </div>
      </Dialog>
    </div>
  );
}
