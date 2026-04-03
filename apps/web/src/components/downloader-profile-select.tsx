import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DownloaderType,
  type DownloaderType as DownloaderTypeValue,
} from "@/lib/wails";

interface DownloaderProfileSelectProps {
  value: DownloaderTypeValue;
  onValueChange: (value: DownloaderTypeValue) => void;
  triggerClassName?: string;
}

export function DownloaderProfileSelect({
  value,
  onValueChange,
  triggerClassName,
}: DownloaderProfileSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as DownloaderTypeValue)
      }
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder="Downloader profile" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={DownloaderType.AUTO}>Auto</SelectItem>
          <SelectItem value={DownloaderType.STEAM}>Steam</SelectItem>
          <SelectItem value={DownloaderType.XBOX}>Xbox</SelectItem>
          <SelectItem value={DownloaderType.EPIC}>Epic Games</SelectItem>
          <SelectItem value={DownloaderType.BATTLE_NET}>Battle.net</SelectItem>
          <SelectItem value={DownloaderType.EA_APP}>EA App</SelectItem>
          <SelectItem value={DownloaderType.UBISOFT_CONNECT}>
            Ubisoft Connect
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
