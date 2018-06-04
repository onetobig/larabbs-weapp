import wepy from 'wepy'
import api from '@/utils/api'
import util from '@/utils/util'

export default class ReplyMixin extends wepy.mixin {
  config = {
    // 可以下拉刷新
    enablePullDownRefresh: true
  }

  data = {
  // 回复数据
    replies: [],
    noMoreData: false,
    isLoading: false,
    page: 1,
  }

  async getReplies(reset = false) {
    try {
      let repliesResponse = await api.request({
        url: this.requestData.url,
        data: {
          page: this.page,
          include: this.requestData.include || 'user'
        }
      })

      if (repliesResponse.statusCode === 200) {
        let replies = repliesResponse.data.data

        replies.forEach(function (reply) {
          reply.created_at_diff = util.diffForHumans(reply.created_at)
        })

        this.replies = reset ? replies : this.replies.concat(replies)

        let pagination = repliesResponse.data.meta.pagination

        if (pagination.current_page === pagination.total_pages) {
          this.noMoreData = true
        }

        this.$apply()
      }

      return repliesResponse
    } catch (err) {
      api.showErrorModal(err)
    }
  }

  async onPullDownRefresh() {
    this.noMoreData = false
    this.page = 1
    await this.getReplies(true)
    wepy.stopPullDownRefresh()
  }

  async onReachBottom() {
    if (this.noMoreData || this.isLoading) {
      return false
    }
// 设置为加载中
    this.isLoading = true
    this.page = this.page + 1
    await this.getReplies()
    this.isLoading = false
    this.$apply()
  }
}
